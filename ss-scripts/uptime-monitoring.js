'use strict';

const config = require('config');
const request = require('koa2-request');
const _ = require('lodash/array');

async function uptimeMonitoring(flag, direction) {
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
    const dbNotExists = require('../libs/db_not-exists');
    const dbInsert = require('../libs/db_insert');
    const positionQuery = require('../libs/db_position-query');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'main': encodeURIComponent('Главная'),
      };

      let range = '';
      let result = [];
      let regions = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

      range = list.main + config.range.params.uptime;
      let uptimeProjects = await crud.read(config.sid.uptime, range);

      uptimeProjects = uptimeProjects.map(project => {
        return project[0];
      });

      resolve('ok!'); //for avoid timeout

      try {
        if (true) { // make request and write in DB

          let now = new Date();
          now = formatDate(now);
          now = now.split(',')[0];

          for (let p = 0; p < uptimeProjects.length; p++) {

            let failData = [];

            let response = await request({
                url: 'http://' + uptimeProjects[p],
                method: 'get',
                headers: {
                  'User-Agent': 'request',
                },
            }).catch((err) => {
              failData.push(now, uptimeProjects[p], 'faled');
            });

            if (response && response.statusCode !== 200) {
              failData.push(now, uptimeProjects[p], 'faled');
            }

            if (failData.length) {
              let flag = await dbNotExists(pool, config.table.uptime, failData);
              if (flag) {
                await dbInsert(pool, config.table.uptime, [failData])
                  .then(async (results) => {console.log(results);})
                  .catch(console.log);
              } else {
                //console.log('the entry is exist');
              }
            }

          }

        } // end request and write in DB

      } catch (e) {
        reject(e.stack);
      }


      // //---------------------------------------------------------------
      // // Get data from DB
      // //---------------------------------------------------------------
      //
      // //- Clear result cells -----------------------------------------
      //
      // let clearResult1 = [];
      // let clearResult2 = [];
      // let range1 = '';
      // let range2 = '';
      //
      // for (let i = 0; i < 1000; i++) {
      //   clearResult1.push(['']);
      // }
      //
      // for (let k = 0; k < 1000; k++) {
      //   clearResult2.push(['']);
      //   for (let l = 0; l < 30; l++) {
      //     clearResult2[k].push('');
      //   }
      // }
      //
      // range1 = list.position + '!F4:F';
      // range2 = list.position + '!J3:AN';
      //
      // await Promise.all([
      //   crud.update(clearResult1, config.sid.positionProfi, range1),
      //   crud.update(clearResult2, config.sid.positionProfi, range2)
      // ])
      //   .then(async results => {console.log(results);})
      //   .catch(console.log);
      //
      // //---------------------------------------------------------------
      //
      // range = list.position + config.range.date.position;
      // let dateSample = await crud.read(config.sid.positionProfi, range);
      //
      // for (let project in positionParam) {
      //   if (positionParam.hasOwnProperty(project)) {
      //
      //     let site = project;
      //     let start = positionParam[project].start;
      //     let region = positionParam[project].region;
      //     let keywords = positionParam[project].keywords.map(keyword => {
      //       return decodeURIComponent(keyword);
      //     });
      //
      //     let params = [dateSample[0], site, keywords];
      //
      //     let positionData = await positionQuery(pool, config.table.position, params);
      //     let positionDataCommon = [];
      //
      //     //console.log(require('util').inspect(positionData, { depth: null }));
      //
      //     let url = positionData[0];
      //
      //     url = url.map(line => {
      //       return [line[0]];
      //     });
      //
      //     range = list.position + '!F' + (start + 1) + ':F';
      //
      //     await crud.update(url, config.sid.positionProfi, range)
      //       .then(async results => {console.log(results);})
      //       .catch(console.log);
      //
      //     positionData.forEach(dataDay => {
      //
      //       let tempData = [];
      //       let top10 = 0;
      //       let topKeys = 0;
      //
      //       dataDay.forEach(data => {
      //         if(Number(data[1]) && Number(data[1]) < 11) {
      //           topKeys++;
      //         }
      //       });
      //
      //       top10 = topKeys / dataDay.length * 100;
      //       top10 = Math.round(top10 * 100) / 100;
      //       tempData.push([top10]);
      //
      //       dataDay.forEach(data =>  {
      //         tempData.push([data.pop()]);
      //       });
      //
      //       if (!positionDataCommon.length) {
      //         positionDataCommon = tempData;
      //       } else {
      //         for (var i = 0; i < tempData.length; i++) {
      //           positionDataCommon[i].push(tempData[i][0]);
      //         }
      //       }
      //
      //     });
      //
      //     range = list.position + '!J' + start + ':AN';
      //
      //     await crud.update(positionDataCommon, config.sid.positionProfi, range)
      //       .then(async results => {console.log(results);})
      //       .catch(console.log);
      //   }
      // }

    } // = End start function =

  });
}

module.exports = uptimeMonitoring;
