const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;

const url = require('url');
const qs = require('querystring');
const path = require('path');
const uuidv4 = require('uuid/v4');

const Utils = require('./Utils.js');
const Storage = require('./Storage.js');
const GithubApi = require('./GithubApi.js');
const BitbucketApi = require('./BitbucketApi.js');
const SfdcApi = require('./SfdcApi.js');
const utils = new Utils();

class Connect {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'connect'
    });
    this.github = new GithubApi();
    this.bitbucket = new BitbucketApi();
    this.sfdc = new SfdcApi();
  }

  newConnect(ev, arg) {
    let connections = this.storage.getAll(); 
    if(!connections) connections = [];
    let connect = arg.connect;
    connect['id'] = uuidv4();
    connections.push(arg.connect);
    this.storage.setAll(connections);
    ev.sender.send('data-new-connection-callback',null, connections);
  }

  getConnections(ev, arg) {
    let result = this.storage.getAll(); 
    ev.sender.send('data-connections-callback',null, result);
  }
  /**
   * OAuth2 Login to provider
   * @param {Object} ev 
   * @param {Object} arg {type : 'github' || 'bitbucket' || 'production' || 'sandbox'}
   */
  authLogin(ev, arg) {
    const self = this;
    let uri;
    if(arg.type == 'github') {
      uri = self.github.getAuthUrl();
    } else if(arg.type == 'bitbucket') {
      uri = self.bitbucket.getAuthUrl();
    } else if(arg.type == 'sfdc') {
      uri = self.sfdc.getAuthUrl(arg.orgType);
    }
    const bounds = utils.getPopWinBounds();
    const loginWindow = new BrowserWindow(bounds);
    // DEBUG
    //console.log('>>>> open url', uri);
    loginWindow.webContents.session.clearStorageData();
    loginWindow.setTitle(arg.type.toUpperCase());
    loginWindow.webContents.on('will-navigate', (event, uri) => {
      const urlObj = url.parse(uri)
      const params = qs.parse(urlObj.query);
      //console.log('>>>> callback url', uri);
      if(urlObj.pathname == '/oauth/callback') {
        /*loginWindow.loadURL(url.format({
          pathname: path.join(__dirname, '../view/loading.html'),
          protocol: 'file:',
          slashes: true
        }));*/
        const authCallback = function(err, res) {
          if (err) {
            loginWindow.close();
            return ev.sender.send('oauth-login-callback',err);
          }
          loginWindow.close();
          res['type'] = params.type;
          return ev.sender.send('oauth-login-callback',null, res);
        }

        if(params.type == 'github' && params.code) {
          return self.github.authorize(params.code, authCallback);
        }
        if(params.type == 'bitbucket') {
          if (uri.split('#').length < 2) {
            loginWindow.close();
            return ev.sender.send('oauth-login-callback','OAuth Error');
          }
          const hash = uri.split('#')[1];
          const token = qs.parse(hash);
          //console.log('>>>> callback ', uri, urlObj, params, token)
          return self.bitbucket.authorize(token, authCallback);
        }
        console.log('>>> params', params);
        if(params.type == 'sfdc' && params.code) {
          return self.sfdc.authorize(params.code, authCallback);
        }
      }
    });
    loginWindow.loadURL(uri);
  }

}

module.exports = Connect;