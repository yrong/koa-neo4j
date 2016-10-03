// Start using koa2 as normal

import Application from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import queryString from 'query-string';
import {Authentication} from './auth';
import {Neo4jConnection, createProcedure, API} from './data';
import {haveIntersection, readMissingFromDefault} from './util';

const defaultOptions = {
    apis: [],
    log: true,
    neo4j: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: 'neo4j'
    }
};


class KoaNeo4jApp extends Application {
    constructor(options) {
        super();
        options = readMissingFromDefault(options, defaultOptions);

        this.router = new Router();
        this.configuredAuthentication = false;
        this.configuredCors = false;

        this.methods = {
            'POST': this.router.post,
            'GET': this.router.get,
            'DEL': this.router.del
        };

        if (options.log)
            this.use(logger());

        this.neo4jConnection = new Neo4jConnection(options.neo4j);
        this.neo4jInitialized = this.neo4jConnection.initialized;


        if (options.authentication)
            this.configureAuthentication(options.authentication);

        this
            .use(cors(options.cors))
            .use(async (ctx, next) => {
                try {
                    await next();
                } catch (error) {
                    ctx.body = { error: String(error) };
                    ctx.status = error.status;
                }
            })
            .use(bodyParser({
                onerror(err, ctx) {
                    ctx.throw('Cannot parse request body', 400);
                }
            }))
            .use(this.router.routes());

        this.executeCypher = this.neo4jConnection.executeCypher;

        for (const api of options.apis)
            this.defineAPI(api);
    }

    defineAPI(options) {
        const api = new API(this.neo4jConnection, options);
        const handler = async(ctx, next) => {
            try {
                if (api.requiresJwtAuthentication)
                    try {
                        await this.authentication.authenticateJwt(ctx, next);
                    } catch (error) {
                        // No Authorization header
                        ctx.status = 401;
                        ctx.body = {error: 'Error: Authorization required'};
                        return;
                    }

                if (api.requiresJwtAuthentication &&
                    !haveIntersection(ctx.user.roles, api.allowedRoles)) {
                    // Incorrect roles
                    ctx.status = 403;
                    ctx.body = {error: "Error: You don't have permission for this"};
                    return;
                }

                let params = {};
                if (ctx.url.indexOf('?') >= 0) {
                    params = `?${ctx.url.split('?')[1]}`;
                    params = queryString.parse(params);
                }
                params = {...params, ...ctx.params, ...ctx.request.body};
                try {
                    ctx.body = await api.response(params, ctx.user);
                } catch (error) {
                    ctx.status = 409;
                    ctx.body = {error: error.fields ? JSON.stringify(error.fields[0])
                        : String(error)};
                }
            } catch (error) {
                ctx.status = 400;
                ctx.body = String(error);
            }
            await next();
        };
        this.methods[api.method].apply(this.router, [api.route, handler]);
        return api;
    }

    configureAuthentication(options) {
        if (this.configuredAuthentication)
            throw new Error('Authentication already configured');
        this.authentication = new Authentication(this.neo4jConnection, options);
        this.use(this.authentication.passport.initialize());
        this.router.post(options.route, this.authentication.authenticateLocal);
        this.configuredAuthentication = true;
    }

    createProcedure(options) {
        return createProcedure(this.neo4jConnection, options);
    }
}

export default KoaNeo4jApp;
