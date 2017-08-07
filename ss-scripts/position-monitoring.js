'use strict';

const config = require('config');
const punycode = require('punycode');
const request = require('koa2-request');
const _ = require('lodash/array');
const {promisify} = require('util');

const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

async function positionSite(flag) {
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
    const positionQuery = require('../libs/db_position-query');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);

      let list = {
        'position': encodeURIComponent('Эвакуатор'),
      };

      let range = '';
      let positionData = [];
      let result = [];

      let site = '';
      let region = '';
      let regions = [];
      let keys = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

      try {

        await readFileAsync('./libs/regions.json', {encoding: 'utf8'})
          .then(data => {
            regions = JSON.parse(data);
          })
          .catch(console.log);

        range = list.position + config.range.position;
        let positionParamRaw = await crud.read(config.sid.position, range);

        site = positionParamRaw[0][1];
        region = regions[positionParamRaw[0][0]];

        positionParamRaw.forEach((params, p)=> {
          if (p > 1) {
            keys.push(params[3]);
          }
        });

        site = site.replace(/http:\/\//g, '');
        site = site.replace(/www./g, '');
        site = site.trim();
        site = punycode.toASCII(site);

        resolve('ok!'); //for avoid timeout

        if (!flag) { // make request and write in DB

            //= Processing the seo ptoject =
            keys = keys.map(key => {
              return encodeURIComponent(key);
            });

            for (let i = 0; i < keys.length; i++) {

              let response = await request({
                  url: 'http://' + config.server.ip + ':3001/position/'
                  + config.yandex.user + '/'
                  + config.yandex.key + '/'
                  + keys[i] + '/'
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

            // console.log(positionData);

            await dbInsert(pool, config.table.position, positionData)
              .then(async (results) => {console.log(results);})
              .catch(console.log);


        } // end request and write in DB

        if (flag) {

          range = list.position + config.range.date;
          let dateSample = await crud.read(config.sid.position, range);

          let params = [dateSample[0], [site], keys];

          //console.log(params);

          let positionData = await positionQuery(pool, config.table.position, params);

          console.log(require('util').inspect(positionData[0][0], { depth: null }));

          let top10 = 0;
          let topKeys = 0;

          positionData[0][0].forEach(data => {
            if(data[1] != '-' && Number(data[1]) < 11) {
              topKeys++;
            }
          });

          top10 = topKeys / (positionData[0][0].length - 1) * 100;
          top10 = Math.round(top10 * 10) / 10;
          let data = positionData[0][0];
          data.unshift([null, top10]);


          range = list.position + '!F3:G';
          await crud.update(data, config.sid.position, range)
            .then(async results => {console.log(results);})
            .catch(console.log);
        }

      } catch (e) {
        reject(e.stack);
      }

    } // = End start function =

  });
}

module.exports = positionSite;
