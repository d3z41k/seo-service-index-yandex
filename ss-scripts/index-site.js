'use strict';

const config = require('config');
const punycode = require('punycode');
const request = require('koa2-request');
const _ = require('lodash/array');

async function indexSite(flag) {
  return new Promise(async (resolve, reject) => {

    //-------------------------------------------------------------------------
    // Usres libs
    //-------------------------------------------------------------------------

    require('../libs/auth')(start);
    const Crud = require('../controllers/crud');
    const formatDate = require('../libs/format-date');
    const sleep = require('../libs/sleep');
    const pool = require('../libs/db_pool');
    const dbInsert = require('../libs/db_insert');
    const indexQuery = require('../libs/db_index-query');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);
      const regexp = /[а-яё]/i; //rus abc

      let list = {
        'index': encodeURIComponent('index'),
        'seo': encodeURIComponent('SEO (реестр)')
      };

      let range = '';
      let seoProjects = [];
      let clearProjects = [];
      let indexData = [];
      let result = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

      try {

        range = list.seo + config.range.params.seo;
        let seoProjectsRaw = await crud.read(config.sid.seo, range);

        seoProjectsRaw.forEach(project => {
          if (project[0] !== 'Отвал') {
            seoProjects.push([project[2]]);
          }
          clearProjects.push(['']);
        });

        range = list.index + config.range.params.index;

        await crud.update(clearProjects, config.sid.index, range)
          .then(async results => {console.log(results);})
          .catch(console.log);

        await crud.update(seoProjects, config.sid.index, range)
          .then(async results => {console.log(results);})
          .catch(console.log);


        resolve('ok!'); //for avoid timeout

        if(!flag) {

          //---------------------------------------------------------------
          // Request index data to proxy (yandex xml) and insert to DB
          //---------------------------------------------------------------

          //= Processing the seo ptoject =

          let seoProjectsProc = seoProjects.map(project => {
            return project[0].replace(/http:\/\//g, '');
          });

          seoProjectsProc.forEach((project, p) => {
            if (regexp.test(project)) {
              seoProjectsProc[p] = punycode.toASCII(project);
            }
          });

          for (let p = 0; p < seoProjectsProc.length; p++) {

            let response = await request({
                url: `http://${config.server.ip}:3001/${config.yandex.user}/${config.yandex.key}/${seoProjectsProc[p]}`,
                method: 'get',
                headers: {
                  'User-Agent': 'request',
                  'content-type': 'application/json',
                  'charset': 'UTF-8'
                },
            });
            let line = response.body.split(',');
            indexData.push(line);
            await sleep(2000);

          }

          //= Insert response data to DB =

          indexData.forEach((line, l) => {
            line[1] = seoProjects[l][0];
          });

          await dbInsert(pool, config.table.index, indexData)
            .then(async (results) => {console.log(results);})
            .catch(console.log);
        }

        //---------------------------------------------------------------
        // Query to DB and insert the data in a destination table
        //---------------------------------------------------------------

        // Clear result cells -------------------------------------------

        let clearResult = [];

        for (let i = 0; i < 200; i++) {
          clearResult.push([
            '', null, '', null, '', null, '', null, '',
            null, '', null, '', null, null, '', null, ''
          ]);
        }

        range = list.index + config.range.result.index;

        await crud.update(clearResult, config.sid.index, range)
          .then(async results => {console.log(results);})
          .catch(console.log);

        //---------------------------------------------------------------

        range = list.index + config.range.date.index;
        let dateRaw = await crud.read(config.sid.index, range);

        range = list.index + config.range.date.index_add;
        let dateAdd = await crud.read(config.sid.index, range);

        let date = _.remove(dateRaw[0], n => {
          return n != '';
        });

        date.push(dateAdd[0][0]);

        seoProjects = seoProjects.map(project => {
          return project[0];
        });

        let params = [date, seoProjects];

        let resultRaw = await indexQuery(pool, config.table.index, params);

        for (let p = 0; p < seoProjects.length; p++) {
          result.push([]);
          for (let d = 0; d < resultRaw.length - 1; d++) {
            if (resultRaw[d][p]) {
              result[p].push(resultRaw[d][p][0]);
            } else {
              result[p].push(0);
            }
            result[p].push(null);
          }
        }

        result.forEach((line, i) => {
          if (resultRaw[resultRaw.length-1][i][0]) {
            line.push(null, line[0], null, resultRaw[resultRaw.length-1][i][0]);
          } else {
            line.push(null, line[0], null, 0);
          }
        });

        //console.log(result);

        range = list.index + config.range.result.index;

        await crud.update(result, config.sid.index, range)
          .then(async results => {console.log(results);})
          .catch(console.log);

      } catch (e) {
        reject(e.stack);
      }

    } // = End start function =

  });
}

module.exports = indexSite;
