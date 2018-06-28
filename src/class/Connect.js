const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;

const url = require('url');
const qs = require('querystring');
const path = require('path');
const uuidv4 = require('uuid/v4');
const moment = require('moment');

const Storage = require('./Storage.js');
const GithubApi = require('./GithubApi.js');
const BitbucketApi = require('./BitbucketApi.js');
const SfdcApi = require('./SfdcApi.js');
const utils = require('./Utils.js');

class Connect {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'connect'
    });
  }

  newConnect(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-new-connection-callback',err, result);
    }
    try{
      let connections = this.storage.getAll({ cache : false }); 
      if(!connections) connections = [];
      let connect = arg.connect;
      connect['id'] = uuidv4();
      connections.push(arg.connect);
      this.storage.setAll(connections);
      return callback(null, connections);
    }catch(err) {
      return callback(err);
    }
  }

  /**
   * Save connection info by id
   * @param {String} id 
   * @param {Object} arg 
   * @return {Boolean} 
   */
  setConnect(id, arg) {
    try{
      let connections = this.storage.getAll({ cache : false }); 
      for(let i in connections) {
        if(id === connections[i].id) {
          for(let key in arg) {
            connections[i][key] = arg[key];
          }
          const now = new Date();
          connections[i].updated_at = now.toISOString();
        }
      }
      this.storage.setAll(connections);
      return true;
    }catch(err) {
      return false;
    }
  }

  getConnections(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-connections-callback',err, result);
    }
    try{
      let result = this.storage.getAll({ cache : false });
      return callback(null, result);
    }catch(err) {
      return callback(err);
    }
  }
  /**
   * OAuth2 Login to provider
   * @param {Object} ev 
   * @param {Object} arg {type : 'github' || 'bitbucket' || 'production' || 'sandbox'}
   */
  authLogin(ev, arg) {
    const self = this;
    let client, uri;
    if(arg.type == 'github') {
      client = new GithubApi();
      uri = client.getAuthUrl();
    } else if(arg.type == 'bitbucket') {
      client = new BitbucketApi();
      uri = client.getAuthUrl();
    } else if(arg.type == 'sfdc') {
      client = new SfdcApi();
      uri = client.getAuthUrl(arg.orgType);
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
        //console.log('>>> params', params);
        if(params.type == 'github' && params.code) {
          return client.authorize(params.code, authCallback);
        }
        if(params.type == 'bitbucket') {
          if (uri.split('#').length < 2) {
            loginWindow.close();
            return ev.sender.send('oauth-login-callback','OAuth Error');
          }
          const hash = uri.split('#')[1];
          const token = qs.parse(hash);
          //console.log('>>>> callback ', uri, urlObj, params, token)
          return client.authorize(token, authCallback);
        }
        if(params.type == 'sfdc' && params.code) {
          return client.authorize(params.code, authCallback);
        }
      }
    });
    loginWindow.loadURL(uri);
  }

  getPullRequests(ev, connection) {
    const self = this;
    const callback = function(err, result) {
      ev.sender.send('git-pullrequests-callback',err, result);
    }
    try{
      //console.log('>>>> getPullRequests ', connection);
      let gitApi;
      let username;
      if(connection.type == 'github') {
        gitApi = new GithubApi(connection);
        username = connection.loginname;
      } else if(connection.type == 'bitbucket') {
        gitApi = new BitbucketApi(connection);
        username = connection.username;
      }
      gitApi.getPullRequests(username, connection.repos.name)
      .then(function(prs) {
        //console.log('>>>> get pull requests ', prs);
        return callback(null, prs);
      })
      .catch(function(err){
        //console.error('>>>> get pull requests error ', err);
        return callback(err);
      });
    }catch(err) {
      return callback(err);
    }
    
  }

  getBranches(ev, connection) {
    const self = this;
    const callback = function(err, result) {
      ev.sender.send('git-branches-callback',err, result);
    }
    try{
      //console.log('>>>> getBranches ', connection);
      let gitApi;
      let username;
      if(connection.type == 'github') {
        gitApi = new GithubApi(connection);
        username = connection.loginname;
      } else if(connection.type == 'bitbucket') {
        gitApi = new BitbucketApi(connection);
        username = connection.username;
      }
      gitApi.getBranches(username, connection.repos.name)
      .then(function(branches) {
        //console.log('>>>> get pull requests ', branches);
        return callback(null, branches);
      })
      .catch(function(err){
        //console.error('>>>> get pull requests error ', err);
        return callback(err);
      });
    }catch(err) {
      return callback(err);
    }
  }

  getCommits(ev, opt) {
    const self = this;
    const callback = function(err, result) {
      ev.sender.send('git-branch-commits-callback',err, result);
    }
    try{
      let {connection, branch} = opt;
      //console.log('>>>> getBranches ', connection, branch);
      let gitApi;
      let username;
      if(connection.type == 'github') {
        gitApi = new GithubApi(connection);
        username = connection.loginname;
      } else if(connection.type == 'bitbucket') {
        gitApi = new BitbucketApi(connection);
        username = connection.username;
      }
      gitApi.getCommits(username, connection.repos.name, branch)
      .then(function(commits) {
        //console.log('>>>> get pull requests ', commits);
        return callback(null, commits);
      })
      .catch(function(err){
        //console.error('>>>> get pull requests error ', err);
        return callback(err);
      });
    }catch(err) {
      return callback(err);
    }
  }
}

module.exports = Connect;