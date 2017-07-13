const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router({prefix: '/api'});

app.use(router.routes());

router
  .get('/index-site', async ctx => {

    const indexSite = require('./ss-scripts/index-site');
    ctx.body = await indexSite();

});

const server = app.listen({port: 3002}, () => {
  console.log('Server start on port: 3002...');
});
