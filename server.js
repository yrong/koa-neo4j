// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import parser from 'koa-body-parser';
import cors from 'kcors';
import queryString from 'query-string';
import apis from './apis';
import passport, {jwt_authenticate ,middleware_auth} from './auth';

const app = new Koa();
const router = new Router();
app
    .use(cors())
    .use(passport.initialize())
    .use(logger())
    .use(parser())
    .use(router.routes());

router.post('/auth', middleware_auth);

let integer_values = new Set(['skip', 'limit', 'id']);


let methods = {
    'POST': router.post,
    'GET': router.get
};

function* key_values(obj) {
    for (let key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

for (let api of apis) {
    let handler = async (ctx, next) => {
        if (api.requires_jwt_token)
            await jwt_authenticate(ctx, next);
        if (ctx.status != 401) {
            let params = {};
            if (ctx.url.indexOf('?') >= 0) {
                params = '?' + ctx.url.split('?')[1];
                params = queryString.parse(params);
            }
            params = {...params, ...ctx.params, ...ctx.request.body};
            for (let [key, value] of key_values(params))
                if (integer_values.has(key))
                    params[key] = parseInt(value);

            try {
                ctx.body = await api.response(params);
            } catch (err) {
                ctx.body = err;
                ctx.status = 400;
            }
        }
        // await next();
    };
    methods[api.method].apply(router, [api.route, handler])
}

app.listen(3000, () => {
	console.log('App listening on port 3000.');
});
