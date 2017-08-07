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
  }).get('/position-single/', async ctx => {
    const positionSingle = require('./ss-scripts/position-single');
    ctx.body = await positionSingle();
  })
  .get('/position-monitoring/', async ctx => {
    const positionMonitoring = require('./ss-scripts/position-monitoring');
    ctx.body = await positionMonitoring(false);
  })
  .get('/position-monitoring/update', async ctx => {
    const positionMonitoring = require('./ss-scripts/position-monitoring');
    ctx.body = await positionMonitoring(true);
});

const server = app.listen({port: 3002}, () => {
  console.log('Server start on port: 3002...');
});
