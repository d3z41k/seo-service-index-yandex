/**
 * [sleep description]
 * @param  {Number}  [ms=0] [description]
 * @return {Promise}        [description]
 */

async function sleep(ms = 0) {
  return new Promise(reject => setTimeout(reject, ms));
}

module.exports = sleep;
