const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router();

const request = require('koa2-request');
const parser = require('xml2json');
const formatDate = require('./libs/format-date');

app.use(router.routes());

router
  .get('/:user/:key/:query/', async (ctx, next) => {
    let params = ctx.params;

    let now = new Date();
    now = formatDate(now);
    now = now.split(',')[0];

    let response = await request({
        url: `https://yandex.ru/search/xml?user=${params.user}&key=${params.key}&query=host:${params.query}`,
        method: 'get',
        headers: {
          'User-Agent': 'request',
          'content-type': 'application/xml',
          'charset': 'UTF-8'
        },
    });

    let jsonBody = parser.toJson(response.body);
    jsonBody = JSON.parse(jsonBody);

    if (jsonBody.yandexsearch.response.error) {

      let response = await request({
          url: `https://yandex.ru/search/xml?user=${params.user}&key=${params.key}&query=site:${params.query}`,
          method: 'get',
          headers: {
            'User-Agent': 'request',
            'content-type': 'application/xml',
            'charset': 'UTF-8'
          },
      });

      jsonBody = parser.toJson(response.body);
      jsonBody = JSON.parse(jsonBody);

    }

    if (jsonBody.yandexsearch.response.error) {

      let response = await request({
          url: `https://yandex.ru/search/xml?user=${params.user}&key=${params.key}&query=host:www.${params.query}`,
          method: 'get',
          headers: {
            'User-Agent': 'request',
            'content-type': 'application/xml',
            'charset': 'UTF-8'
          },
      });

      jsonBody = parser.toJson(response.body);
      jsonBody = JSON.parse(jsonBody);
    }

    if (!jsonBody.yandexsearch.response.error) {

      let found = jsonBody.yandexsearch.response.found[2].$t;
      ctx.body = [now, params.query, found, 'ok'].join();

    } else {
      ctx.body = [now, params.query, 'error', jsonBody.yandexsearch.response.error.$t].join();
    }

  }).get('/position/:user/:key/:query/:region/:site/', async (ctx, next) => {
    let params = ctx.params;

    let response = await request({
        url: 'https://yandex.ru/search/xml?' +
          'user=' + params.user +
          '&key=' + params.key +
          '&query=' + encodeURIComponent(params.query) +
          '&lr=' + params.region +
          '&l10n=ru' +
          '&sortby=rlv' +
          '&filter=none' +
          '&groupby=attr=\"\".mode=flat.groups-on-page=50.docs-in-group=1',

        method: 'get',
        headers: {
          'User-Agent': 'request',
          'content-type': 'application/xml',
          'charset': 'UTF-8'
        },
    });

    let resultSite = [];
    let position = '-';
    let url = '-';

    let jsonBody = parser.toJson(response.body);
    jsonBody = JSON.parse(jsonBody);

    let resultGroup = jsonBody.yandexsearch.response.results.grouping.group;

    resultGroup.forEach(result => {
      resultSite.push(result.doc);
    });

    for (let i = 0; i < resultSite.length; i++) {
      if (resultSite[i]['domain'] == params.site) {
        position = i + 1;
        url = resultSite[i]['url'];
        break;
      }
    }

    let now = new Date();
    now = formatDate(now);
    now = now.split(',')[0];

    ctx.body = now + ',' + params.site + ',' + params.query + ',' + url + ',' + position;
});


const server = app.listen({port: 3001}, () => {
  console.log('Proxy start on port: 3001...');
});
