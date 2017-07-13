async function indexQuery(pool, tableName, params) {
  return new Promise(async(resolve, reject) => {

    let result = [];

    try {

      for (let d = 0; d < params[0].length; d++) {
        result.push([]);
        for (let s = 0; s < params[1].length; s++) {
          await pool.execute('SELECT `pages` FROM '+ tableName +' WHERE ' +
              '`date` = ? ' +
              'AND `site` = ? ' +
              'LIMIT 1', [
                params[0][d],
                params[1][s],
              ])
            .then(([col, feilds]) => {
              for (let key in col[0]) {
                result[d].push([col[0][key] ? col[0][key] : 0]);
              }

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

module.exports = indexQuery;
