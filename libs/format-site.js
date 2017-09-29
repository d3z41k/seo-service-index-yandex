const punycode = require('punycode');

function formatSite(site) {

  site = site.replace(/http:\/\//g, '');
  site = site.replace(/https:\/\//g, '');
  site = site.replace(/www./g, '');
  site = site.replace(/\//g, '');
  site = site.trim();
  site = punycode.toASCII(site);
  return site;
}

module.exports = formatSite;
