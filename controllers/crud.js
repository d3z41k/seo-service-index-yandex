const google = require('googleapis');

class Crud {

  constructor(auth) {
    this.auth = auth;
  }

  async read(spreadsheetId, range) {
    return new Promise(async(resolve, reject) => {

      let sheets = google.sheets('v4');

      sheets.spreadsheets.values.get({
        auth: this.auth,
        spreadsheetId: spreadsheetId,
        range: range
      }, (err, response) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }
        resolve(response.values);
      });

    });
  }

  async update(data, spreadsheetId, range) {
    return new Promise(async(resolve, reject) => {

      let sheets = google.sheets('v4');

      sheets.spreadsheets.values.update({
        auth: this.auth,
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: data
        }
      }, (err) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }

        resolve('update - OK!');

      });

    });
  }


}

module.exports = Crud;
