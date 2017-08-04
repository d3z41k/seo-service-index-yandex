'use strict';

async function dbInsert(pool, tableName, data) {
  return new Promise(async (resolve, reject) => {

    for (let i = 0; i < data.length; i++) {
      await pool.query("INSERT INTO " + tableName + " VALUES (NULL, '" + data[i].join('\', \'') + "')")
        .catch(err => {reject(err);});
    }
    resolve('The data was inserted in: ' + tableName);

  });
}

module.exports = dbInsert;
