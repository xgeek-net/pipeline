const path = require('path');
const fse = require('fs-extra');
const { ipcRenderer, ipcMain } = require('electron-ipc-mock')();

const CONFIG = require('../src/config/config');
const TOKEN = require('./token');

exports.baseTestDirectory = function() {
  return path.join(__dirname, '..');
};

exports.clearData = function(filename) {
  let filePath = path.join(__dirname, 'cache');
  filePath = path.join(filePath, filename);
  if(fse.pathExistsSync(filePath)) fse.removeSync(filePath);
  return true;
};

/**
 * Send ipc request to electron api mock
 * @param {String} apiName ipc request api name
 * @param {Object} params  ipc request parameters
 * @param {Function} ipcCallback ipc reqest mock callback function
 */
exports.send = function(apiName, params, ipcCallback) {
  return new Promise(function(resolve, reject) {
    ipcMain.on(apiName, ipcCallback);
    ipcRenderer.send(apiName, params);
    ipcRenderer.on(apiName + '-callback', function (event, err, res) {
      if(err) return reject(err);
      // ignore callback when pipeline processing
      if(res.type == 'process') return;
      return resolve(res);
    });
  });
};

exports.getGitConnect = function() {
  const token = TOKEN;
  const now = new Date();
  let connection = {
    'access_token': token.github.access_token,
    'avatar': token.github.avatar,
    'loginname': token.github.loginname,
    'repos': token.github.repos,
    'username': token.github.username,
    'type': 'github',
    'name': 'Github Deploy',
    created_at : now.toISOString(),
    updated_at : now.toISOString()
  };
  return connection;
};

exports.getSfdcConnect = function() {
  const token = TOKEN;
  const now = new Date();
  let connection = {
    'accessToken': token.sfdc.accessToken,
    'avatar': token.sfdc.avatar,
    'fullname': token.sfdc.fullname,
    'instanceUrl': token.sfdc.instanceUrl,
    'language': token.sfdc.language,
    'loginUrl': token.sfdc.loginUrl,
    'orgId': token.sfdc.orgId,
    'orgType': token.sfdc.orgType,
    'refreshToken': token.sfdc.refreshToken,
    'userId': token.sfdc.userId,
    'username': token.sfdc.username,
    'type': 'sfdc',
    'name': 'SFDC Deploy',
    created_at : now.toISOString(),
    updated_at : now.toISOString()
  };
  return connection;
};

/**
 * Make pipeline test data for Github deploy to SFDC
 * @param {String} from connection id
 * @param {String} to connection id
 */
exports.getGtihubPipeline = function(from, to) {
  const now = new Date();
  let pipeline = {
    'type': 'branch',
    'name': 'Github deploy to SFDC',
    'path': 'metadata',
    'branch': {
      'name': 'master',
      'sha': ''
    },
    'commits': []
  }
  pipeline['from'] = from;
  pipeline['to'] = to;
  pipeline['toApiVersion'] = CONFIG.SFDC_MAX_API_VERSION;
  pipeline['fromApiVersion'] = CONFIG.SFDC_MAX_API_VERSION;
  pipeline['action'] = 'deploy';
  pipeline['checkOnly'] = true;
  pipeline['runTests'] = false;
  pipeline['created_at'] = now.toISOString();
  pipeline['updated_at'] = now.toISOString();
  return pipeline;
};
