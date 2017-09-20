'use strict';

const config = require('config');
const request = require('koa2-request');
const _ = require('lodash/array');

async function uptimeMonitoring(update) {
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
    const uptimeQuery = require('../libs/db_uptime-query');

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
      // Get projects and date for uptime
      //---------------------------------------------------------------

      range = list.main + config.range.params.uptime;
      let uptimeParams = await crud.read(config.sid.uptime, range);
      let uptimeProjects = [];
      let uptimeDate = '';

      uptimeParams.forEach((row, p) => {
        if (p) {
          uptimeProjects.push(row[0]);
        } else {
          row.shift();
          uptimeDate = row;
        }
      });

      resolve('ok!'); //for avoid timeout

      if (!update) { // make request and write in DB

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
            failData.push(now, uptimeProjects[p], 'fail');
          });

          if (response && response.statusCode !== 200) {
            failData.push(now, uptimeProjects[p], 'fail');
          }

          if (failData.length) {
            let flag = await dbNotExists(pool, config.table.uptime, failData);
            if (flag) {
              await dbInsert(pool, config.table.uptime, [failData])
              //  .then(async (results) => {console.log(results);})
                .catch(console.log);
            } else {
              //console.log('the entry is exist');
            }
          }

        }

      } // end request and write in DB

      //---------------------------------------------------------------
      // Get data from DB
      //---------------------------------------------------------------

      //- Clear result cells -----------------------------------------

      let clearResult = [];

      for (let k = 0; k < 200; k++) {
        clearResult.push(['']);
        for (let l = 0; l < 6; l++) {
          clearResult[k].push('');
        }
      }

      range = list.main + '!B3:H';

      await crud.update(clearResult, config.sid.uptime, range)
      //  .then(async results => {console.log(results);})
        .catch(console.log);

      //---------------------------------------------------------------

      let params = [uptimeDate, uptimeProjects, 'fail'];
      let uptimeData = await uptimeQuery(pool, config.table.uptime, params);

      await crud.update(uptimeData, config.sid.uptime, range)
      //  .then(async results => {console.log(results);})
        .catch(console.log);

    } // = End start function =

  });
}

module.exports = uptimeMonitoring;
