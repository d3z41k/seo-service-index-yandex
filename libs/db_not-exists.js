'use strict';

async function dbNotExists(pool, tableName, data) {
  return new Promise(async (resolve, reject) => {

      await pool.execute('SELECT * FROM ' + tableName + ' WHERE ' +
        '`date` = ? ' +
        'AND `site` = ? ' +
        'AND `status` = ? ' +
        'LIMIT 1', [
          data[0],
          data[1],
          data[2],
        ])
        .then(([col, feilds]) => {
          if (!col.length) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => {
          console.log;
        });

  });
}

module.exports = dbNotExists;
