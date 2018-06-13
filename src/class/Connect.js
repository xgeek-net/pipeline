const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;

const url = require('url');
const qs = require('querystring');
const path = require('path');
const uuidv4 = require('uuid/v4');

const Utils = require('./Utils.js');
const Storage = require('./Storage.js');
const GithubApi = require('./GithubApi.js');
const utils = new Utils();

class Connect {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'connect'
    });
    this.github = new GithubApi();
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

  authLogin(ev, arg) {
    const self = this;
    let uri;
    if(arg.type == 'github') {
      uri = self.github.getAuthUrl();
    }
    const bounds = utils.getPopWinBounds();
    const loginWindow = new BrowserWindow(bounds);
    // DEBUG
    loginWindow.webContents.session.clearStorageData();
    loginWindow.webContents.on('will-navigate', (event, uri) => {
      const urlObj = url.parse(uri)
      const params = qs.parse(urlObj.query);
      //console.log('>>>> callback url', urlObj, params);
      if(urlObj.pathname == '/oauth/callback' && params.code) {
        /*loginWindow.loadURL(url.format({
          pathname: path.join(__dirname, '../view/loading.html'),
          protocol: 'file:',
          slashes: true
        }));*/
        if(params.type == 'github') {
          self.github.authorize(params.code, function(err, res){
            if (err) {
              loginWindow.close();
              return ev.sender.send('oauth-login-callback',err);
            }
            loginWindow.close();
            res['type'] = 'github';
            return ev.sender.send('oauth-login-callback',null, res);
          });
        }
        // TODO Bitbucket
      }
    });
    loginWindow.loadURL(uri);
  }

}

module.exports = Connect;