// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import passport, {authenticateJwt, authenticateLocal,
    setSecret, setuserQueryCypherFile, useAuthentication} from './auth';
import {initializeDatabase} from './data';
import {keyValues, haveIntersection, readMissingFromDefault} from './util';

const defaultOptions = {
    apis: [],
    database: {
        server: 'http://localhost:7474',
        endpoint: '/db/data',
        user: 'neo4j',
        password: 'neo4j'
    },
    authentication: {
        userQueryCypherFile: './cypher/auth.cyp',
        route: '/auth',
        secret: 'secret'
    }
};

const koaNeo4jApp = (options) => {
    options = readMissingFromDefault(options, defaultOptions);
    initializeDatabase(options.database.server, options.database.endpoint,
        options.database.user, options.database.password);

    const app = new Koa();
    const router = new Router();

    if (options.authentication) {
        setSecret(options.authentication.secret);
        setuserQueryCypherFile(options.authentication.userQueryCypherFile);
        useAuthentication();
        router.post(options.authentication.route, authenticateLocal);
    }

    app
        .use(cors())
        .use(passport.initialize())
        .use(logger())
        .use(parser())
        .use(router.routes());

    const integerValues = new Set(['skip', 'limit', 'id']);


    const methods = {
        'POST': router.post,
        'GET': router.get
    };

    for (const api of options.apis) {
        const handler = async (ctx, next) => {
            if (api.requiresJwtAuthentication)
                await authenticateJwt(ctx, next);
            if (ctx.status !== 401) {
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
            }
        };
        methods[api.method].apply(router, [api.route, handler]);
    }
    return app;
};

export API from './data';
export default koaNeo4jApp;
