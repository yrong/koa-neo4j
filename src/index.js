import Application from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import {Authentication} from './auth';
import {Neo4jConnection, API} from './data';
import {createProcedure} from './procedure';
import {haveIntersection} from './util';
import http from 'http';

const defaultOptions = {
    apis: [],
    neo4j: {
        url: 'neo4j://localhost',
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

        this.methods = {
            'GET': this.router.get,
            'POST': this.router.post,
            'PUT': this.router.put,
            'DEL': this.router.del,
            'PATCH':this.router.patch
        };

        this.neo4jConnection = new Neo4jConnection(options.neo4j);
        this.neo4jInitialized = this.neo4jConnection.initialized;

        const server = http.createServer(this.callback());
        this.server = server;

        if (!options.loadMiddlewareByApp) {
            this.configuredAuthentication = false;
            if (options.authentication)
                this.configureAuthentication(options.authentication);


            this
                .use(cors(options.cors))
                .use(bodyParser({
                    onerror(error, ctx) {
                        ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`);
                    }
                }));

            this.use(async (ctx, next) => {
                try {
                    const start = new Date();
                    await next();
                    const ms = new Date() - start;
                    console.log('%s %s - %s ms', ctx.method, ctx.originalUrl, ms);
                } catch (error) {
                    ctx.body = String(error);
                    ctx.status = error.status || 500;
                    console.log('%s %s - then%s', ctx.method, ctx.originalUrl,
                        error.stack || error);
                }
            });
        }

        if (!options.loadRouteByApp) {
            this.use(this.router.routes());
            for (const api of options.apis)
                this.defineAPI(api);
        }
    }

    defineAPI(options) {
        const api = new API(this.neo4jConnection, options);
        const handler = async (ctx, next) => {
            if (api.requiresJwtAuthentication)
                try {
                    await this.authentication.authenticateJwt(ctx, () => {});
                } catch (error) {
                    // No Authorization header
                    ctx.throw(401, 'authorization required');
                }

            if (api.requiresJwtAuthentication &&
                !haveIntersection(ctx.user.roles, api.allowedRoles))
                ctx.throw(403, 'user does not have permission for this resource');

            const params = {...{}, ...ctx.query, ...ctx.params, ...ctx.request.body};
            ctx.body = await api.invoke(params, ctx);
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
