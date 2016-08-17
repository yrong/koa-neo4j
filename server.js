// Start using koa2 as normal

import Koa from 'koa';
import Router from 'koa-router';
import apis from './apis';
import queryString from 'query-string';


const app = new Koa();
const router = new Router();
app.use(router.routes());


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
            ctx.status = 500;
        }
        await next();
    };
    methods[api.method].apply(router, [api.route, handler])
}

app.listen(3000, () => {
	console.log('App listening on port 3000.');
});
