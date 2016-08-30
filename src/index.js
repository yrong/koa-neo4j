// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import passport, {authenticateJwt, authenticateLocal, useAuthentication} from './auth';
import API, {initializeDatabase} from './data';
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

const app = new Koa();
const router = new Router();

const methods = {
    'POST': router.post,
    'GET': router.get,
    'DEL': router.del
};

const defineAPI = apiObject => {
    const api = new API(apiObject);
    const handler = async (ctx, next) => {
        if (api.requiresJwtAuthentication)
            await authenticateJwt(ctx, next);
        if (ctx.status !== 401)
            if (api.requiresJwtAuthentication &&
                !haveIntersection(ctx.user.roles, api.allowedRoles)) {
                ctx.status = 403;
                ctx.body = {error: "Error: You don't have permission for this"};
            } else {
                let params = {};
                if (ctx.url.indexOf('?') >= 0) {
                    params = `?${ctx.url.split('?')[1]}`;
                    params = queryString.parse(params);
                }
                params = {...params, ...ctx.params, ...ctx.request.body};
                try {
                    ctx.body = await api.response(params);
                } catch (err) {
                    ctx.body = err;
                    ctx.status = 400;
                }
            }
    };
    methods[api.method].apply(router, [api.route, handler]);
};


const configureAuthentication = options => {
    useAuthentication(options);
    app.use(passport.initialize());
    router.post(options.route, authenticateLocal);
};


const configureCors = options => app.use(cors(options));


const koaNeo4jApp = (options) => {
    options = readMissingFromDefault(options, defaultOptions);
    initializeDatabase(options.neo4j).catch((err) => { setTimeout(() => { throw err; }); });

    if (options.log)
        app.use(logger());

    if (options.authentication)
        configureAuthentication(options.authentication);

    configureCors(options.cors);

    app
        .use(parser())
        .use(router.routes());

    for (const api of options.apis)
        defineAPI(api);
    return app;
};

export {executeCypher, neo4jInt} from './data';
export {pipe} from './util';
export {defineAPI, configureAuthentication, router};
export default koaNeo4jApp;
