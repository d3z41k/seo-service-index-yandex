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

        range = list.seo + config.range.seo;
        let seoProjectsRaw = await crud.read(config.sid.seo, range);

        seoProjectsRaw.forEach(project => {
          if (project[0] !== 'Отвал') {
            seoProjects.push([project[2]]);
          }
          clearProjects.push(['']);
        });

        range = list.index + config.range.index;

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
            await sleep(1500);

          }

          //= Insert response data to DB =

          indexData.forEach((line, l) => {
            line[1] = seoProjects[l][0];
          });

          await dbInsert(pool, config.db.table, indexData)
            .then(async (results) => {console.log(results);})
            .catch(console.log);
        }

        //---------------------------------------------------------------
        // Query to DB and insert the data in a destination table
        //---------------------------------------------------------------

        range = list.index + config.range.date;
        let dateRaw = await crud.read(config.sid.index, range);

        let date = _.remove(dateRaw[0], n => {
          return n != '';
        });

        seoProjects = seoProjects.map(project => {
          return project[0];
        });

        let params = [date, seoProjects];
        let resultRaw = await indexQuery(pool, config.db.table, params);

        for (let p = 0; p < seoProjects.length; p++) {
          result.push([]);
          for (let d = 0; d < resultRaw.length; d++) {
            if (resultRaw[d][p]) {
              result[p].push(resultRaw[d][p][0]);
            } else {
              result[p].push(0);
            }
            result[p].push(null);
          }
        }

        range = list.index + config.range.data;

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
