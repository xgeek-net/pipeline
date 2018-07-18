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
    const result = this.storage.getAll();
    ev.sender.send('data-setting-callback',null, result);
  }
}

module.exports = Setting;