const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router({prefix: '/api'});

app.use(router.routes());

router
  .get('/index-site', async ctx => {
    const indexSite = require('./ss-scripts/index-site');
    ctx.body = await indexSite(false);
  })
  .get('/index-site/update', async ctx => {
    const indexSite = require('./ss-scripts/index-site');
    ctx.body = await indexSite(true);
  })
  .get('/position-single/:sheet', async ctx => {
    const sheet = ctx.params.sheet;
    const positionSingle = require('./ss-scripts/position-single');
    ctx.body = await positionSingle(sheet);
  })
  .get('/position-monitoring/:direction', async ctx => {
    const direction = ctx.params.direction;
    const positionMonitoring = require('./ss-scripts/position-monitoring');
    ctx.body = await positionMonitoring(false, direction);
  })
  .get('/position-monitoring/update/:direction', async ctx => {
    const direction = ctx.params.direction;
    const positionMonitoring = require('./ss-scripts/position-monitoring');
    ctx.body = await positionMonitoring(true, direction);
  })
  .get('/search-top/:sheet', async ctx => {
    const sheet = ctx.params.sheet;
    const searchTop = require('./ss-scripts/search-top');
    ctx.body = await searchTop(sheet);
});

const server = app.listen({port: 3002}, () => {
  console.log('Server start on port: 3002...');
});
