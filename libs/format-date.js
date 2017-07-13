/**
 * [formatDate description]
 * @param  {[type]} date [description]
 * @return {[type]}      [description]
 */

function formatDate(date) {

  let dd = date.getDate();
  if (dd < 10) dd = '0' + dd;

  let mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;

  let yy = date.getFullYear();

  let hh = date.getHours();
  //Correct time GMT +3 -> GMT +2
  if (hh == '00') {
    hh = '23'
  } else {
    hh -= 1;
  }
  if (hh < 10) hh = '0' + hh;

  let MM = date.getMinutes();
  if (MM < 10) MM = '0' + MM;

  let ss = date.getSeconds();
  if (ss < 10) ss = '0' + ss;

  return dd + '.' + mm + '.' + yy + ', ' + hh + ':' + MM + ':' + ss;
}

module.exports = formatDate;
