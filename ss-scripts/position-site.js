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
    const indexQuery = require('../libs/db_index-query');

    //---------------------------------------------------------------
    // Main function
    //---------------------------------------------------------------

    async function start(auth) {

      const crud = new Crud(auth);
      const regexp = /[а-яё]/i; //rus abc

      let list = {
        'position': encodeURIComponent('position'),
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

      await readFileAsync('./libs/regions.json', {encoding: 'utf8'})
        .then(data => {
          regions = JSON.parse(data);
        })
        .catch(console.log);

      try {

        range = list.position + config.range.position;
        let positionParamRaw = await crud.read(config.sid.position, range);

        site = positionParamRaw[0][1];
        region = regions[positionParamRaw[0][0]];

        positionParamRaw.forEach((params, p)=> {
          if (p > 1) {
            keys.push(params[3]);
          }
        });

        resolve('ok!'); //for avoid timeout

        //---------------------------------------------------------------
        //
        //---------------------------------------------------------------

        //= Processing the seo ptoject =

        site = site.replace(/http:\/\//g, '');
        site = site.replace(/www./g, '');
        site = site.trim();
        site = punycode.toASCII(site);

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

        let top10 = 0;
        let topKeys = 0;

        positionData.forEach(data => {
          if(data[1] != '-' && data[1] < 11) {
            topKeys++;
          }
          if (data[0]) {
            data[0] = data[0].replace(/http:\/\//g, '');
            data[0] = data[0].replace(/www./g, '');
            data[0] = data[0].replace(site, '');
          }
        });

        top10 = topKeys / (positionData.length - 1) * 100;
        top10 = Math.round(top10 * 10) / 10;
        positionData.unshift([null, top10]);

        //console.log(positionData);

        range = list.position + '!F3:G';
        await crud.update(positionData, config.sid.position, range)
          .then(async results => {console.log(results);})
          .catch(console.log);

      } catch (e) {
        reject(e.stack);
      }

    } // = End start function =

  });
}

module.exports = positionSite;
