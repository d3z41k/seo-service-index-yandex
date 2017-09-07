'use strict';

const config = require('config');
const request = require('koa2-request');
const cheerio = require('cheerio');
const _ = require('lodash/array');
const {promisify} = require('util');
const Iconv  = require('iconv').Iconv;
const translator = new Iconv('cp1251', 'utf-8');

const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

async function searchTop(sheet) {
  return new Promise(async (resolve, reject) => {

    //--------------------------------------------------------------------------
    // Usres libs
    //--------------------------------------------------------------------------

    require('../libs/auth')(start);
    const Crud = require('../controllers/crud');
    const formatDate = require('../libs/format-date');
    const formatSite = require('../libs/format-site');
    const sleep = require('../libs/sleep');

    //--------------------------------------------------------------------------
    // Main function
    //--------------------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'top10': encodeURIComponent(sheet),
      };

      let range = '';
      let top10DataArr = [];
      let top10DataFinal = [];
      let result = [];
      let site = '';
      let region = '';
      let regions = [];
      let keywords = [];
      let sitesAll = [];
      let urlAll = [];

      await readFileAsync('./libs/regions.json', {encoding: 'utf8'})
        .then(data => {
          regions = JSON.parse(data);
        })
        .catch(console.log);

      range = list.top10 + '!A2:C';
      let top10Params = await crud.read(config.sid.top10, range);

      region = regions[top10Params[0][0]];

      top10Params.forEach((params, p)=> {
        if (p > 0) {
          keywords.push(params[2]);
        }
      });

      resolve('ok!'); //for avoid timeout

      //- Request data to xml.yandex -----------------------------------------

      // try {

        keywords = keywords.map(keyword => {
            return encodeURIComponent(keyword);
        });

        for (let i = 0; i < keywords.length; i++) {

            let response = await request({
                url: 'http://' + config.server.ip + ':3001/top/'
                + config.yandex.user + '/'
                + config.yandex.key + '/'
                + keywords[i] + '/'
                + region,
                method: 'get',
                headers: {
                  'User-Agent': 'request',
                  'content-type': 'application/json',
                  'charset': 'UTF-8'
                },
            });

            top10DataArr.push(response.body.split(','));
            await sleep(1500);
            
            //console.log('get top-10 ' + i);
          }

          //- Clear result cells -----------------------------------------------

          let range1 = '';
          let range2 = '';
          let range3 = '';

          let clearResult1 = [];
          let clearResult2 = [];

          for (let i = 0; i < 10; i++) {
            clearResult1.push(['', '']);
          }

          for (let i = 0; i < 3000; i++) {
            clearResult2.push(['', null , '', '', '', '', '', '', '', '', '', '', '']);
          }

          range1 = list.top10 + '!F3:G';
          range2 = list.top10 + '!J3:V';

          await Promise.all([
            crud.update(clearResult1, config.sid.top10, range1),
            crud.update(clearResult2, config.sid.top10, range2),
          ])
          //  .then(async results => {console.log(results);})
            .catch(console.log);

          //- Get TOP-10 -------------------------------------------------------

          let top10 = {};
          let top10Sort = [];
          let divider = keywords.length;

          top10DataArr.forEach(top10Data => {
            top10Data = JSON.parse(top10Data);
            top10Data.forEach((data, i) => {

              if (!sitesAll.includes(data[1])) {
                sitesAll.push(data[1]);
                top10[data[1]] = 1;
              } else {
                top10[data[1]]++;
              }

              let url = data[2];
              urlAll.push(url);

              if (!i) {
                top10DataFinal.push([data[0], null, data[1], url]);
              } else {
                top10DataFinal.push([null, null, data[1], url]);
              }

            });
          });

          for (site in top10) {
            if (top10.hasOwnProperty(site)) {
              top10[site] = top10[site] / divider * 100;
              top10[site] = Math.round(top10[site] * 100) / 100;
              top10[site] > 100 ? top10[site] = 100 : top10[site];
            }
          }

          //- Sort TOP-10 ------------------------------------------------------

          for (site in top10) {
            top10Sort.push([site, top10[site]]);
          }
          top10Sort.sort((a, b) => {
              return b[1] - a[1];
          });
          top10Sort.length = 10;

          //- Insert TOP-10 ----------------------------------------------------

          range = list.top10 + '!J3:M';
          await crud.update(top10DataFinal, config.sid.top10, range)
          //  .then(async results => {console.log(results);})
            .catch(console.log);

          range = list.top10 + '!F3:G';
          await crud.update(top10Sort, config.sid.top10, range)
          //  .then(async results => {console.log(results);})
            .catch(console.log);

          //- Parse results ----------------------------------------------------

          let mataAll = [];
          let corpus = {};

          for (var u = 0; u < urlAll.length; u++) {

            let response = await request({
                url: urlAll[u],
                encoding: null,
                rejectUnauthorized: false,
            })
            .catch(() => {
              mataAll.push(['','','','','','','','']);
            });

            if (response) {

               let body = response.body;
               //body = translator.convert(response.body).toString(); // convert windows-1251 to utf-8
               const $ = cheerio.load(body);

               let text = $('body').text();
               let title = $('title').text();
               let description = $('meta[name="description"]').attr('content');
               let h1 = $('h1').text();
               let h2 = $('h2').toArray().map(value => {
                 return $(value).text();
               });

               text = text.replace(/\s+/g, ' ')
                        .replace(/[^а-яёА-ЯЁ ]/g, '')
                        .toLowerCase();

               text = text.split(' ');

               for (let w = 0; w < text.length; w++) {
                 if (text[w].length > 4 && text[w].length < 20) {
                   if (corpus[text[w]]) {
                     corpus[text[w]]++;
                   } else {
                     corpus[text[w]] = 1;
                   }
                 }
               }

               title ? title = title.replace(/\n/g, '').trim() : '';
               description ? description = description.replace(/\n/g, '').trim() : '';
               h1 ? h1 = h1.replace(/\n/g, '').trim() : '';

               let meta = [title, description, h1];

               h2.forEach((header, i)=> {
                 if (i < 5) {
                   header ? meta.push(header.replace(/\n/g, '').trim()) : meta.push('');
                 }
               });

               mataAll.push(meta);

               //console.log('get meta' + u);

            }
          } //end urlAll

          let words = [];

          for (let prop in corpus) {
            if (corpus.hasOwnProperty(prop)) {
              words.push([prop, corpus[prop]]);
            }
          }

          words.sort((a, b) => {
            return b[1] - a[1];
          });

          words = words.slice(0, 30);

          range1 = list.top10 + '!O3:V';
          range2 = list.top10 + '!X3:Y';

          await Promise.all([
            crud.update(mataAll, config.sid.top10, range1),
            crud.update(words, config.sid.top10, range2),
          ])
            .then(async results => {console.log(results);})
            .catch(console.log);

        // } catch (e) {
        //   reject(e.stack);
        // }

    } // = End start function =

  });
}

module.exports = searchTop;
