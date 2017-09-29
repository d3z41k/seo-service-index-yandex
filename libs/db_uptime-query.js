async function uploadQuery(pool, tableName, params) {
  return new Promise(async(resolve, reject) => {

    let result = [];

    try {

      for (let p = 0; p < params[1].length; p++) {
        result.push([]);
        for (let d = 0; d < params[0].length; d++) {

          await pool.execute('SELECT `status` FROM '+ tableName +' WHERE ' +
              '`date` = ? ' +
              'AND `site` = ? ' +
              'LIMIT 1', [
                params[0][d],
                params[1][p],
              ])
            .then(([col, feilds]) => {
              result[p].push(col[0] ? col[0]['status'] : null);
            })
            .catch(err => {
              console.log(err)
            });

        }
     }

    } catch (e) {
      reject(e.stack);
    }

    resolve(result);

  });
}

module.exports = uploadQuery;
