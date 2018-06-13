const Storage = require('./Storage.js');

class Setting {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'setting',
      defaults: {
        windowBounds: { width: 800, height: 600 }
      }
    });
  }

  get(key) {
    return this.storage.get(key);
  }

  set(key, val) {
    return this.storage.set(key, val);
  }
}

module.exports = Setting;