// Start using koa2 as normal

import Application from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import queryString from 'query-string';
import {Authentication} from './auth';
import {Neo4jConnection, createProcedure, API} from './data';
import {haveIntersection} from './util';

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
        options = {...defaultOptions, ...options};

        this.router = new Router();
        this.configuredAuthentication = false;

        this.methods = {
            'GET': this.router.get,
            'POST': this.router.post,
            'PUT': this.router.put,
            'DEL': this.router.del
        };

        this.neo4jConnection = new Neo4jConnection(options.neo4j);
        this.neo4jInitialized = this.neo4jConnection.initialized;


        if (options.authentication)
            this.configureAuthentication(options.authentication);

        if (options.log)
            this.use(logger());

        this
            .use(cors(options.cors))
            .use(async (ctx, next) => {
                try {
                    await next();
                } catch (error) {
                    ctx.body = String(error);
                    ctx.status = error.status;
                }
            })
            .use(bodyParser({
                onerror(error, ctx) {
                    ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
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
            if (api.requiresJwtAuthentication)
                try {
                    await this.authentication.authenticateJwt(ctx, next);
                } catch (error) {
                    // No Authorization header
                    ctx.throw('authorization required', 401);
                }

            if (api.requiresJwtAuthentication &&
                !haveIntersection(ctx.user.roles, api.allowedRoles))
                ctx.throw('user does not have permission for this resource', 403);

            let params = {};
            if (ctx.url.indexOf('?') >= 0) {
                params = `?${ctx.url.split('?')[1]}`;
                params = queryString.parse(params);
            }
            params = {...params, ...ctx.params, ...ctx.request.body};
            try {
                ctx.body = await api.invoke(params, ctx.user);
            } catch (error) {
                ctx.throw(error.message || error, 409);
            }
            await next();
        };
        this.methods[api.method].apply(this.router, [api.route, handler]);
        return api;
    }

    configureAuthentication(options) {
        if (this.configuredAuthentication)
            throw new Error('authentication already configured');
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
