const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router();

const bodyParser = require('koa-bodyparser');
const request = require('koa2-request');

const parser = require('xml2json');

app.use(bodyParser());
app.use(router.routes());

router
  .get('/:user/:key/:query/', async ctx => {
    let reqest = ctx.params;

    let response = await request({
        url: `https://yandex.ru/search/xml?user=${reqest.user}&key=${reqest.key}&query=host:${reqest.query}`,
        method: 'get',
        headers: {
          'User-Agent': 'request',
          'content-type': 'application/xml',
          'charset': 'UTF-8'
        },
        json: true,
    });

    let json = parser.toJson(response.body);
    console.log(json);

    ctx.body = json;
});



const server = app.listen({port: 3001}, () => {
  console.log('Server start on port: 3001...');
});
