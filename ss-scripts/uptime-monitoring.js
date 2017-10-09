'use strict';

const config = require('config');
const request = require('koa2-request');
const _ = require('lodash/array');
const cheerio = require('cheerio');

async function uptimeMonitoring(profi) {
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
    // mts function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'encode': function(sheet) {
          return encodeURIComponent(sheet);
        }
      };

      let range = '';

      resolve('ok!'); //for avoid timeout

      //---------------------------------------------------------------
      // Get projects and date for uptime
      //---------------------------------------------------------------

      let now = new Date();
      now = formatDate(now);
      now = now.split(',')[0];

      if (!profi) { //MTC projects

        //-make request and write in DB ----------------

        range = list.encode(config.directions.mts) + config.range.params.uptime;
        let uptimeParams = await crud.read(config.sid.uptime, range);
        let uptimeProjects = [];
        let uptimeDate = '';

        uptimeParams.forEach((row, p) => {
          if (p) {
            uptimeProjects.push(row[0].replace(/http:\/\//g, ''));
          } else {
            row.shift();
            uptimeDate = row;
          }
        });

        for (let p = 0; p < uptimeProjects.length; p++) {

          let failData = [];
          let titleData = [];

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

          if(response && response.statusCode === 200) {
            const $ = cheerio.load(response.body);
            let title = $('title').text();
            title ? title = title.replace(/\n/g, '').trim() : '';
            titleData.push(now, uptimeProjects[p], title);
          }

          if (titleData.length) {
            let flag = await dbNotExists(pool, config.table.uptime, titleData);
            if (flag) {
              await dbInsert(pool, config.table.uptime, [titleData])
                .then(async (results) => {console.log(results);})
                .catch(console.log);
            } else {
              //console.log('the entry is exist');
            }
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

        range = list.encode(config.directions.mts) + '!B3:H';

        await crud.update(clearResult, config.sid.uptime, range)
        //  .then(async results => {console.log(results);})
          .catch(console.log);

        //---------------------------------------------------------------

        let params = [uptimeDate, uptimeProjects];

        let uptimeData = await uptimeQuery(pool, config.table.uptime, params);

        await crud.update(uptimeData, config.sid.uptime, range)
        //  .then(async results => {console.log(results);})
          .catch(console.log);

      } //end MTC

      //------------------------------------------------------------------------

      if (profi) { //PROFI derections

        // -make request and write in DB ----------------

        const PROFI = config.directions.profi;

        for (var d = 0; d < PROFI.length; d++) {

          range = list.encode(PROFI[d]) + config.range.params.uptime;
          let uptimeParams = await crud.read(config.sid.uptimeProfi, range);
          let uptimeProjects = [];
          let uptimeDate = '';

          uptimeParams.forEach((row, p) => {
            if (p) {
              uptimeProjects.push(row[0].replace(/http:\/\//g, ''));
            } else {
              row.shift();
              uptimeDate = row;
            }
          });

          for (let p = 0; p < uptimeProjects.length; p++) {

            let titleData = [];
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

            if(response && response.statusCode === 200) {
              const $ = cheerio.load(response.body);
              let title = $('title').text();
              title ? title = title.replace(/\n/g, '').trim() : '';
              titleData.push(now, uptimeProjects[p], title);
            }

            if (titleData.length) {
              let flag = await dbNotExists(pool, config.table.uptime, titleData);
              if (flag) {
                await dbInsert(pool, config.table.uptime, [titleData])
                  .then(async (results) => {console.log(results);})
                  .catch(console.log);
              } else {
                //console.log('the entry is exist');
              }
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

          range = list.encode(PROFI[d]) + '!B3:H';

          await crud.update(clearResult, config.sid.uptimeProfi, range)
          //  .then(async results => {console.log(results);})
            .catch(console.log);

          //---------------------------------------------------------------

          let params = [uptimeDate, uptimeProjects, 'fail'];
          let uptimeData = await uptimeQuery(pool, config.table.uptime, params);

          await crud.update(uptimeData, config.sid.uptimeProfi, range)
          //  .then(async results => {console.log(results);})
            .catch(console.log);

        } //end ditection

      } //end PROFI

    } // = End start function =

  });
}

module.exports = uptimeMonitoring;
