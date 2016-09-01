// Start using koa2 as normal

import Application from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import {Authentication} from './auth';
import {API, Neo4jConnection} from './data';
import {haveIntersection, readMissingFromDefault} from './util';

const defaultOptions = {
    apis: [],
    log: true,
    neo4j: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: 'neo4j'
    },
    authentication: {
        userCypherQueryFile: './cypher/user.cyp',
        rolesCypherQueryFile: './cypher/roles.cyp',
        route: '/auth',
        secret: 'secret'
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

        if (options.authentication && !this.configuredAuthentication)
            this.configureAuthentication(options.authentication);

        if (!this.configuredCors)
            this.configureCors(options.cors);

        this
            .use(parser())
            .use(this.router.routes());

        this.neo4jConnection = new Neo4jConnection(options.neo4j);

        this.executeCypher = this.neo4jConnection.executeCypher;

        this.neo4jInitialized = this.neo4jConnection.initialized;

        for (const api of options.apis)
            this.defineAPI(api);
    }

    defineAPI(apiObject) {
        const api = new API(this.neo4jConnection, apiObject);
        const handler = async(ctx, next) => {
            try {
                if (api.requiresJwtAuthentication)
                    try {
                        await this.authentication.authenticateJwt(ctx, next);
                    } catch (error) {
                        ctx.status = 401;
                        ctx.body = {error: error.fields ? String(error.fields[0]) : String(error)};
                        return;
                    }

                if (api.requiresJwtAuthentication &&
                    !haveIntersection(ctx.user.roles, api.allowedRoles)) {
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
                    ctx.body = await api.response(params);
                } catch (error) {
                    ctx.body = String(error);
                    ctx.status = 500;
                }
            } catch (error) {
                ctx.status = 400;
                ctx.body = String(error);
            }
        };
        this.methods[api.method].apply(this.router, [api.route, handler]);
    }

    configureAuthentication(options) {
        if (this.configuredAuthentication)
            throw new Error('Authentication already configured');
        this.authentication = new Authentication(options);
        this.use(this.authentication.passport.initialize());
        this.router.post(options.route, this.authentication.authenticateLocal);
        this.configuredAuthentication = true;
    }


    configureCors(options) {
        if (this.configuredCors)
            throw new Error('KCors already configured');
        this.use(cors(options));
        this.configuredCors = true;
    }
}

export default KoaNeo4jApp;
