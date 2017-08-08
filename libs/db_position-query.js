async function positionQuery(pool, tableName, params) {
  return new Promise(async(resolve, reject) => {

    let result = [];

    try {

      for (let d = 0; d < params[0].length; d++) {
        result.push([]);
        for (let s = 0; s < params[1].length; s++) {
          result[d].push([]);
          for (let k = 0; k < params[2].length; k++) {

            await pool.execute('SELECT `url`, `position` FROM '+ tableName +' WHERE ' +
                '`date` = ? ' +
                'AND `site` = ? ' +
                'AND `keyword` = ? ' +
                'LIMIT 1', [
                  params[0][d],
                  params[1][s],
                  params[2][k]
                ])
              .then(([col, feilds]) => {
                result[d][s].push(col[0] ? [col[0]['url'], col[0]['position']] : [0, 0]);
              })
              .catch(err => {
                console.log(err)
              });

          }
        }
     }

    } catch (e) {
      reject(e.stack);
    }

    resolve(result);

  });
}

module.exports = positionQuery;
