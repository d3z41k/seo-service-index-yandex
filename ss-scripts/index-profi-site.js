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
        'directions': config.directions.profi,
        'seo': encodeURIComponent('Справочник')
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

        range = list.seo + '!A2:B';
        let seoProjectsRaw = await crud.read(config.sid.seoProfi, range);

        list.directions.forEach(direction => {
          seoProjects[direction] = [];
          clearProjects[direction] = [];

          seoProjectsRaw.forEach(project => {
            if (project[1].trim() === direction) {
              seoProjects[direction].push([project[0].trim().replace(/https:\/\//g, '').replace(/http:\/\//g, '').replace(/\//g, '')]);
            }
          });

        });

        for (let i = 0; i < 140; i++) {
          clearProjects.push(['']);
        }

        for (let i = 0; i < list.directions.length; i++) {

            range = encodeURIComponent(list.directions[i]) + '!A3';

            await crud.update(clearProjects[list.directions[i]], config.sid.indexProfi, range)
              .then(async results => {console.log(results);})
              .catch(console.log);
            
            await crud.update(seoProjects[list.directions[i]], config.sid.indexProfi, range)
              .then(async results => {console.log(results);})
              .catch(console.log);
        }

        resolve('ok!'); //for avoid timeout
        
        if(!flag) {
        
          //---------------------------------------------------------------
          // Request index data to proxy (yandex xml) and insert to DB
          //---------------------------------------------------------------
        
          //= Processing the seo ptoject =
        
          let seoProjectsProc = [];

          list.directions.forEach(direction => {
            seoProjectsProc[direction] = [];
            seoProjects[direction].forEach(project => {
              seoProjectsProc[direction].push(project[0]);
            });
          });

          list.directions.forEach(direction => {
            seoProjectsProc[direction].forEach((project, p) => {
              if (regexp.test(project)) {
                seoProjectsProc[direction][p] = punycode.toASCII(project);
              }
            });
          });

          for (let i = 0; i < list.directions.length; i++) {

            let indexData = [];

            for (let p = 0; p < seoProjectsProc[list.directions[i]].length; p++) {
        
              let response = await request({
                  url: `http://${config.server.ip}:3001/${config.yandex.user}/${config.yandex.key}/${seoProjectsProc[list.directions[i]][p]}`,
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
              line[1] = seoProjects[list.directions[i]][l][0];
            });
          
            await dbInsert(pool, config.table.indexProfi, indexData)
              .then(async (results) => {console.log(results);})
              .catch(console.log);
            
          }
    
        }
        
        //---------------------------------------------------------------
        // Query to DB and insert the data in a destination table
        //---------------------------------------------------------------
        
        // Clear result cells -------------------------------------------
        
        let clearResult = [];
        
        for (let i = 0; i < 100; i++) {
          clearResult.push([
            '', null, '', null, '', null, '', null, '',
            null, '', null, '', null, null, '', null, ''
          ]);
        }

        for (let i = 0; i < list.directions.length; i++) {
            range = encodeURIComponent(list.directions[i]) + '!B3:S';
        
            await crud.update(clearResult, config.sid.indexProfi, range)
              .then(async results => {console.log(results);})
              .catch(console.log);
        }
        
        //---------------------------------------------------------------

        range = encodeURIComponent(list.directions[0]) + '!B2:N2';

        let dateRaw = await crud.read(config.sid.indexProfi, range);

        range = encodeURIComponent(list.directions[0]) + '!S2';
        let dateAdd = await crud.read(config.sid.indexProfi, range);
        
        let date = _.remove(dateRaw[0], n => {
          return n != '';
        });
        
        date.push(dateAdd[0][0]);
        
        list.directions.forEach(direction => {
            seoProjects[direction] = seoProjects[direction].map(project => {
                return project[0];
            });
        });

        for (let i = 0; i < list.directions.length; i++) {

            let result = [];
            let params = [date, seoProjects[list.directions[i]]];
            let resultRaw = await indexQuery(pool, config.table.indexProfi, params);

            for (let p = 0; p < seoProjects[list.directions[i]].length; p++) {
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
              if (resultRaw[resultRaw.length - 1][i][0]) {
                line.push(null, line[0], null, resultRaw[resultRaw.length - 1][i][0]);
              } else {
                line.push(null, line[0], null, 0);
              }
            });

            range = encodeURIComponent(list.directions[i]) + '!B3:S';
            
            await crud.update(result, config.sid.indexProfi, range)
              .then(async results => {console.log(results);})
              .catch(console.log);
        }

        //console.log(result);

      } catch (e) {
        reject(e.stack);
      }

    } // = End start function =

  });
}

module.exports = indexSite;