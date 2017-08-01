'use strict';

const config = require('config');
const punycode = require('punycode');
const request = require('koa2-request');
const _ = require('lodash/array');

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
      let keys = [];

      //---------------------------------------------------------------
      // The seo projects update
      //---------------------------------------------------------------

      try {

        range = list.position + config.range.position;
        let positionParamRaw = await crud.read(config.sid.position, range);

        site = positionParamRaw[0][1];
        region = positionParamRaw[0][0];

        positionParamRaw.forEach((params, p)=> {
          if (p) {
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

          let position = response.body.split(',');
          console.log(position);
          positionData.push(position);
          await sleep(1500);

        }

        range = list.position + '!F3:F';
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
