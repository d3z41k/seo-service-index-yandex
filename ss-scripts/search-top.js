'use strict';

const config = require('config');
const request = require('koa2-request');
const _ = require('lodash/array');
const {promisify} = require('util');

const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

async function searchTop() {
  return new Promise(async (resolve, reject) => {

    //--------------------------------------------------------------------------
    // Usres libs
    //--------------------------------------------------------------------------

    require('../libs/auth')(start);
    const Crud = require('../controllers/crud');
    const formatDate = require('../libs/format-date');
    const formatSite = require('../libs/format-site');
    const sleep = require('../libs/sleep');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'top10': encodeURIComponent('ТОП-10'),
      };

      let range = '';
      let top10DataArr = [];
      let top10DataFinal = [];
      let result = [];
      let site = '';
      let region = '';
      let regions = [];
      let keywords = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

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

        //---------------------------------------------------------------
        //
        //---------------------------------------------------------------

        try {

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
          }

          //- Clear result cells ---------------------------------------------

          let range1 = '';
          let range2 = '';
          let range3 = '';

          let clearResult1 = [];
          let clearResult2 = [];

          for (let i = 0; i < 10; i++) {
            clearResult1.push(['', '']);
          }

          for (let i = 0; i < 1000; i++) {
            clearResult2.push(['']);
          }

          range1 = list.top10 + '!F3:G';
          range2 = list.top10 + '!J3:J';
          range3 = list.top10 + '!L3:L';

          await Promise.all([
            crud.update(clearResult1, config.sid.top10, range1),
            crud.update(clearResult2, config.sid.top10, range2),
            crud.update(clearResult2, config.sid.top10, range3)
          ])
            .then(async results => {console.log(results);})
            .catch(console.log);

          //------------------------------------------------------------------

          top10DataArr.forEach(top10Data => {
            top10Data = JSON.parse(top10Data);
            top10Data.forEach((data, i) => {
              if (!i) {
                top10DataFinal.push([data[0], null, data[1], data[2]]);
              } else {
                top10DataFinal.push([null, null, data[1], data[2]]);
              }
            });
          });

          //console.log(top10DataFinal);

          range = list.top10 + '!J3:M';

          await crud.update(top10DataFinal, config.sid.top10, range)
            .then(async results => {console.log(results);})
            .catch(console.log);

        } catch (e) {
           reject(e.stack);
        }

      // try {
      //
      //   range = list.position + config.range.params.position;
      //   let positionParamRaw = await crud.read(config.sid.position, range);
      //
      //   site = positionParamRaw[0][1];
      //   region = regions[positionParamRaw[0][0]];
      //
      //   positionParamRaw.forEach((params, p)=> {
      //     if (p > 1) {
      //       keys.push(params[3]);
      //     }
      //   });
      //
      //   resolve('ok!'); //for avoid timeout
      //
      //   //---------------------------------------------------------------
      //   //
      //   //---------------------------------------------------------------
      //
      //   //= Processing the seo ptoject =
      //
      //   site = formatSite(site);
      //
      //   keys = keys.map(key => {
      //     return encodeURIComponent(key);
      //   });
      //
      //   for (let i = 0; i < keys.length; i++) {
      //
      //     let response = await request({
      //         url: 'http://' + config.server.ip + ':3001/position/'
      //         + config.yandex.user + '/'
      //         + config.yandex.key + '/'
      //         + keys[i] + '/'
      //         + region + '/'
      //         + site,
      //         method: 'get',
      //         headers: {
      //           'User-Agent': 'request',
      //           'content-type': 'application/json',
      //           'charset': 'UTF-8'
      //         },
      //     });
      //
      //     positionData.push(response.body.split(',').splice(3, 2));
      //     await sleep(1500);
      //
      //   }
      //
      //   // Clear result cells -------------------------------------------
      //
      //   let clearResult = [];
      //
      //   for (let i = 0; i < 190; i++) {
      //     clearResult.push(['', '']);
      //   }
      //
      //   range = list.position + config.range.result.positionSingle;
      //
      //   await crud.update(clearResult, config.sid.position, range)
      //     .then(async results => {console.log(results);})
      //     .catch(console.log);
      //
      //   //---------------------------------------------------------------
      //
      //   let top10 = 0;
      //   let topKeys = 0;
      //
      //   positionData.forEach(data => {
      //     if(Number(data[1]) && Number(data[1]) < 11) {
      //       topKeys++;
      //     }
      //     if (data[0]) {
      //       data[0] = data[0].replace(/http:\/\//g, '');
      //       data[0] = data[0].replace(/www./g, '');
      //       data[0] = data[0].replace(site, '');
      //     }
      //   });
      //
      //   top10 = topKeys / positionData.length * 100;
      //   top10 = Math.round(top10 * 100) / 100;
      //   positionData.unshift([null, top10]);
      //
      //   range = list.position + config.range.result.positionSingle;
      //
      //   await crud.update(positionData, config.sid.position, range)
      //     .then(async results => {console.log(results);})
      //     .catch(console.log);
      //
      // } catch (e) {
      //   reject(e.stack);
      // }

    } // = End start function =

  });
}

module.exports = searchTop;
