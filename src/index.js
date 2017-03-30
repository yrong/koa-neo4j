// Start using koa2 as normal

import Application from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import queryString from 'query-string';
import compose from 'koa-compose';
import {Authentication} from './auth';
import {Neo4jConnection, API} from './data';
import {createProcedure} from './procedure';
import {haveIntersection} from './util';

const defaultOptions = {
    apis: [],
    neo4j: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: 'neo4j'
    },
    sensitive:true
};


class KoaNeo4jApp extends Application {
    constructor(options) {
        super();
        options = {...defaultOptions, ...options};

        this.router = new Router({sensitive:options.sensitive});
        this.configuredAuthentication = false;

        this.methods = {
            'GET': this.router.get,
            'POST': this.router.post,
            'PUT': this.router.put,
            'DEL': this.router.del,
            'PATCH':this.router.patch
        };

        this.neo4jConnection = new Neo4jConnection(options.neo4j);
        this.neo4jInitialized = this.neo4jConnection.initialized;


        if (options.authentication)
            this.configureAuthentication(options.authentication);

        if (!options.logger)
            this.use(logger());

        this
            .use(cors(options.cors))
            .use(async (ctx, next) => {
                try {
                    const start = new Date()
                    await next();
                    const ms = new Date() - start
                    if (options.logger)
                        options.logger.info('%s %s - %s ms', ctx.method,ctx.originalUrl, ms)
                } catch (error) {
                    if (options.exceptionWrapper)
                        ctx.body = options.exceptionWrapper(error)
                    else
                        ctx.body = String(error)
                    ctx.status = error.status || 500
                    if (options.logger)
                        options.logger.error('%s %s - %s', ctx.method,ctx.originalUrl, String(error))
                }
            })
            .use(bodyParser({
                onerror(error, ctx) {
                    ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
                }
            }))

        if(Array.isArray(options.middleware))
            this.use(compose(options.middleware))

        this.use(this.router.routes());

        this.executeCypher = this.neo4jConnection.executeCypher;

        for (const api of options.apis)
            this.defineAPI(api);
    }

    defineAPI(options) {
        const api = new API(this.neo4jConnection, options);
        const handler = async(ctx, next) => {
            if (api.requiresJwtAuthentication)
                try {
                    await this.authentication.authenticateJwt(ctx, () => {});
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
                ctx.body = await api.invoke(params, ctx);
            } catch (error) {
                ctx.throw(error.message || error, error.status || 409);
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
