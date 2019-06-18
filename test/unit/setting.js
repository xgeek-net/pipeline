const { assert, expect } = require('chai')

const helper = require('../test-helper');
const Setting = require('../../src/class/Setting');
const setting = new Setting();
const JSON_FILE_NAME = 'setting.json';

describe('class Setting.js', function () {
  this.timeout(10000);

  before(function (done) {
    helper.clearData(JSON_FILE_NAME);
    done();
  });

  after(function (done) {
    helper.clearData(JSON_FILE_NAME);
    done();
  });

  it('should get setting data', function (done) {
    helper.send('data-setting', {}, function (event, arg) {
      setting.getSetting(event, arg);
    })
    .then(function(result) {
      assert.isObject(result);
      assert.isObject(result.windowBounds);
      done();
    })
  });

  it('should save setting data', function (done) {
    setting.set('windowBounds', { width : 800, height : 600 });
    const bounds = setting.get('windowBounds');
    assert.isObject(bounds);
    expect(bounds.width).to.equal(800);
    done();
  });

});