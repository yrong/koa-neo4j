// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import passport, {authenticateJwt, authenticateLocal, useAuthentication} from './auth';
import API, {initializeDatabase} from './data';
import {keyValues, haveIntersection, readMissingFromDefault} from './util';

const defaultOptions = {
    apis: [],
    log: true,
    database: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: 'neo4j'
    },
    authentication: {
        userQueryCypherFile: './cypher/auth.cyp',
        route: '/auth',
        secret: 'secret'
    }
};

const app = new Koa();
const router = new Router();

const integerValues = new Set(['skip', 'limit', 'id']);

const methods = {
    'POST': router.post,
    'GET': router.get
};

const defineAPI = apiObject => {
    const api = new API(apiObject);
    const handler = async (ctx, next) => {
        if (api.requiresJwtAuthentication)
            await authenticateJwt(ctx, next);
        if (ctx.status !== 401)
            if (api.requiresJwtAuthentication &&
                !haveIntersection(ctx.state.user.roles, api.allowedRoles)) {
                ctx.status = 403;
                ctx.body = {error: "Error: You don't have permission for this"};
            } else {
                let params = {};
                if (ctx.url.indexOf('?') >= 0) {
                    params = '?${ctx.url.split("?")[1]}';
                    params = queryString.parse(params);
                }
                params = {...params, ...ctx.params, ...ctx.request.body};
                for (const [key, value] of keyValues(params))
                    if (integerValues.has(key))
                        params[key] = parseInt(value);

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

const koaNeo4jApp = (options) => {
    options = readMissingFromDefault(options, defaultOptions);
    initializeDatabase(options.database);

    if (options.authentication) {
        useAuthentication(options.authentication);
        router.post(options.authentication.route, authenticateLocal);
    }

    if (options.log)
        app.use(logger());

    app
        .use(cors())
        .use(passport.initialize())
        .use(parser())
        .use(router.routes());

    for (const api of options.apis)
        defineAPI(api);
    return app;
};

export {defineAPI, router, passport};
export default koaNeo4jApp;
