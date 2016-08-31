// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import passport, {authenticateJwt, authenticateLocal, useAuthentication} from './auth';
import API, {initializeNeo4j} from './data';
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


const koaNeo4jApp = (options) => {
    options = readMissingFromDefault(options, defaultOptions);
    // initializeNeo4j(options.neo4j).catch((err) => { setTimeout(() => { throw err; }); });

    const app = new Koa();
    const router = new Router();
    app.configuredAuthentication = false;
    app.configuredCors = false;

    app.methods = {
        'POST': router.post,
        'GET': router.get,
        'DEL': router.del
    };

    app.defineAPI = apiObject => {
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
        app.methods[api.method].apply(router, [api.route, handler]);
    };


    app.configureAuthentication = options => {
        if (app.configuredAuthentication)
            throw new Error('Authentication already configured');
        useAuthentication(options);
        app.use(passport.initialize());
        router.post(options.route, authenticateLocal);
        app.configuredAuthentication = true;
    };


    app.configureCors = options => {
        if (app.configuredCors)
            throw new Error('KCors already configured');
        app.use(cors(options));
        app.configuredCors = true;
    };

    app.neo4jInitialized = initializeNeo4j(options.neo4j);

    if (options.log)
        app.use(logger());

    if (options.authentication && !app.configuredAuthentication)
        app.configureAuthentication(options.authentication);

    if (!app.configuredCors)
        app.configureCors(options.cors);

    app
        .use(parser())
        .use(router.routes());

    for (const api of options.apis)
        app.defineAPI(api);
    return app;
};

export {executeCypher} from './data';
export default koaNeo4jApp;
