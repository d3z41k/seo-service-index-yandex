'use strict';

const config = require('config');
const request = require('koa2-request');
const _ = require('lodash/array');
const {promisify} = require('util');

const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

async function positionSite(flag, direction) {
  return new Promise(async (resolve, reject) => {

    //-------------------------------------------------------------------------
    // Usres libs
    //-------------------------------------------------------------------------

    require('../libs/auth')(start);
    const Crud = require('../controllers/crud');
    const formatDate = require('../libs/format-date');
    const formatSite = require('../libs/format-site');
    const sleep = require('../libs/sleep');
    const pool = require('../libs/db_pool');
    const dbInsert = require('../libs/db_insert');
    const positionQuery = require('../libs/db_position-query');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'position': encodeURIComponent(direction),
      };

      let range = '';
      let result = [];
      let regions = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

      await readFileAsync('./libs/regions.json', {encoding: 'utf8'})
        .then(data => {
          regions = JSON.parse(data);
        })
        .catch(console.log);

      range = list.position + config.range.params.position;
      let positionParamRaw = await crud.read(config.sid.position, range);

      //console.log(positionParamRaw);

      let positionParam = {};
      let currentProject = '';

      positionParamRaw.forEach((line, l)=> {

        if (line.length == 2 && line[0] && line[1]) {

          let site = formatSite(line[1])

          positionParam[site] = {
            'start': l + 3,
            'region': regions[line[0]],
            'keywords': []
          };
          currentProject = site;
        }

        if (line.length == 4 && line[3] && currentProject) {
          positionParam[currentProject].keywords.push(encodeURIComponent(line[3]));
        }

      });

      //console.log(positionParam);

      resolve('ok!'); //for avoid timeout

      if (!flag) { // make request and write in DB

          for (let project in positionParam) {
            if (positionParam.hasOwnProperty(project)) {

              let site = project;
              let region = positionParam[project].region;
              let keywords = positionParam[project].keywords;
              let positionData = [];

              for (let i = 0; i < keywords.length; i++) {

                let response = await request({
                    url: 'http://' + config.server.ip + ':3001/position/'
                    + config.yandex.user + '/'
                    + config.yandex.key + '/'
                    + keywords[i] + '/'
                    + region + '/'
                    + site,
                    method: 'get',
                    headers: {
                      'User-Agent': 'request',
                      'content-type': 'application/json',
                      'charset': 'UTF-8'
                    },
                });

                positionData.push(response.body.split(','));
                await sleep(1500);
              }

              positionData.forEach(data => {
                if (data[3]) {
                  data[3] = data[3].replace(/http:\/\//g, '');
                  data[3] = data[3].replace(/www./g, '');
                  data[3] = data[3].replace(site, '');
                }
              });

              //console.log(positionData);

              await dbInsert(pool, config.table.position, positionData)
                .then(async (results) => {console.log(results);})
                .catch(console.log);

              await sleep(1500);

            }
          }

      } // end request and write in DB

      //---------------------------------------------------------------
      // Get data from DB
      //---------------------------------------------------------------

      //- Clear result cells -----------------------------------------

      let clearResult1 = [];
      let clearResult2 = [];
      let range1 = '';
      let range2 = '';

      for (let i = 0; i < 1000; i++) {
        clearResult1.push(['']);
      }

      for (let k = 0; k < 1000; k++) {
        clearResult2.push(['']);
        for (let l = 0; l < 30; l++) {
          clearResult2[k].push('');
        }
      }

      range1 = list.position + '!F4:F';
      range2 = list.position + '!J3:AN';

      await Promise.all([
        crud.update(clearResult1, config.sid.position, range1),
        crud.update(clearResult2, config.sid.position, range2)
      ])
        .then(async results => {console.log(results);})
        .catch(console.log);

      //---------------------------------------------------------------

      range = list.position + config.range.date.position;
      let dateSample = await crud.read(config.sid.position, range);

      for (let project in positionParam) {
        if (positionParam.hasOwnProperty(project)) {

          let site = project;
          let start = positionParam[project].start;
          let region = positionParam[project].region;
          let keywords = positionParam[project].keywords.map(keyword => {
            return decodeURIComponent(keyword);
          });

          let params = [dateSample[0], site, keywords];

          let positionData = await positionQuery(pool, config.table.position, params);
          let positionDataCommon = [];

          //console.log(require('util').inspect(positionData, { depth: null }));

          let url = positionData[0];

          url = url.map(line => {
            return [line[0]];
          });

          range = list.position + '!F' + (start + 1) + ':F';

          await crud.update(url, config.sid.position, range)
            .then(async results => {console.log(results);})
            .catch(console.log);

          positionData.forEach(dataDay => {

            let tempData = [];
            let top10 = 0;
            let topKeys = 0;

            dataDay.forEach(data => {
              if(Number(data[1]) && Number(data[1]) < 11) {
                topKeys++;
              }
            });

            top10 = topKeys / dataDay.length * 100;
            top10 = Math.round(top10 * 100) / 100;
            tempData.push([top10]);

            dataDay.forEach(data =>  {
              tempData.push([data.pop()]);
            });

            if (!positionDataCommon.length) {
              positionDataCommon = tempData;
            } else {
              for (var i = 0; i < tempData.length; i++) {
                positionDataCommon[i].push(tempData[i][0]);
              }
            }

          });

          range = list.position + '!J' + start + ':AN';

          await crud.update(positionDataCommon, config.sid.position, range)
            .then(async results => {console.log(results);})
            .catch(console.log);
        }
      }

    } // = End start function =

  });
}

module.exports = positionSite;
