const request = require('request');
const Storage = require('./Storage.js');
const CONFIG = require('../config/config');

class Setting {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'setting',
      defaults: {
        windowBounds: { width: 800, height: 600 },
        apiVersion: CONFIG.SFDC_DEFAULT_API_VERSION,
        pfMaxApiVersion: CONFIG.SFDC_MAX_API_VERSION
      }
    });
  }

  get(key) {
    return this.storage.get(key);
  }

  set(key, val) {
    return this.storage.set(key, val);
  }

  getSetting(ev, arg) {
    let result = this.storage.getAll();
    const callback = function() {
      ev.sender.send('data-setting-callback',null, result);
    }

    result['apiVersion'] = CONFIG.SFDC_DEFAULT_API_VERSION;
    result['pfMaxApiVersion'] = CONFIG.SFDC_MAX_API_VERSION;
    // Get app remote package.json
    request(CONFIG.GIT_REMOTE_PACKAGE_URI, function (err, res, body) {
      if(err) return callback();
      try {
        const appVersion = require('../../package.json').version;
        const remotePackage = (body && body.length > 0) ? JSON.parse(body) : { version : appVersion };
        result['appVersion'] = appVersion;
        result['appLatestVersion'] = remotePackage.version;
        result['appLastReleaseUrl'] = CONFIG.GIT_REMOTE_LAST_RELEASE;
      } catch(err) {
        console.error(err);
      }
      return callback();
    });
  }
}

module.exports = Setting;