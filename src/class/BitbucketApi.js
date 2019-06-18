//@deprecated Bitbuck API OAuth flow is no working
const request = require('request');
const async = require('async');
const path = require('path');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');
const moment = require('moment');

const CONFIG = require('../config/config');
const CLIENT = require('../config/client');
const utils = require('./Utils');
const Metadata = require('./Metadata');

class BitbucketApi {
  constructor(opts) {
    opts = opts || {};
    this.access_token = opts.access_token;
    this.refresh_token = opts.refresh_token;
    // Pipeline info object
    this.pipeline = null; 
    // Pipeline process logger
    this.logger = null; 
    // Pipeline downloaded file list
    this.cacheFiles = null;
  }

  getAuthUrl() {
    const url = CLIENT.BITBUCKET_END_POINT + '/authorize'
        + '?client_id=' + CLIENT.BITBUCKET_CLIENT_ID
        + '&response_type=code';
    return url;
  }

  /**
   * Authorize access token from code
   * @param {String} code  
   * @param {Function} callback 
   */
  authorize(code, callback) {
    let resp = {};
    const self = this;
    const params = {
      form: { code : code, grant_type : 'authorization_code', 
              client_id : CLIENT.BITBUCKET_CLIENT_ID, client_secret : CLIENT.BITBUCKET_CLIENT_SECRET 
            },
      url: CLIENT.BITBUCKET_END_POINT + '/access_token',
      json: true,
    };
    request.post(params, function(err, body, token) {
      if(err) return callback(err);
      resp = token;
      var now = new Date();
      now.setSeconds(now.getSeconds() + resp.expires_in);
      resp['expires_at'] = now.toISOString();
      self.access_token = token.access_token;
      self.refresh_token = token.refresh_token;
      self.apiCall('user', function(err, user) {
        if(err) return callback(err);
        resp['username'] = user.username;
        resp['avatar'] = user.links.avatar.href;
        self.getReposList(user.username, function(err, reposList) {
          if(err) return callback(err);
          resp['repos'] = reposList;
          return callback(err, resp);
        });
        
      }); // .self.apiCall('user'
    });
    
  }

  /**
   * Request repos list
   * @param {String} username 
   * @param {Function} callback 
   */
  getReposList(username, callback) {
    const self = this;
    self.apiCall('repositories/' + username, { sort : '-updated_on' }, function(err, response) {
      if(err) return callback(err);
      let reposList = [];
      const repos = response.values;
      for(let rep of repos) {
        reposList.push({
          id : rep.uuid,
          name : rep.name,
          full_name : rep.full_name,
          private : rep.is_private
        });
      }
      return callback(null, reposList);
    }); // .self.apiCall('repositories/'
  }

  /**
   * Authorize access token from code
   * @param {Object} connetion
   * @param {Function} callback 
   */
  checkToken(connetion) {
    const self = this;
    return new Promise(function(resolve, reject) {
      if(moment().isBefore(moment(connetion.expires_at))) {
        return resolve(true);
      }
      const params = {
        form: { refresh_token : self.refresh_token, grant_type : 'refresh_token', 
                client_id : CLIENT.BITBUCKET_CLIENT_ID, client_secret : CLIENT.BITBUCKET_CLIENT_SECRET 
              },
        url: CLIENT.BITBUCKET_END_POINT + '/access_token',
        json: true,
      };
      let resp = {};
      request.post(params, function(err, body, token) {
        if(err) return reject(err);
        self.access_token = token.access_token;
        self.refresh_token = token.access_token;
        resp = token;
        var now = new Date();
        now.setSeconds(now.getSeconds() + resp.expires_in);
        resp['expires_at'] = now.toISOString();
        return resolve(resp);
      });
    });
  }

  /**
   * Get repository
   * @param {String} username - name
   * @param {String} reposName - name
   * @return {Promise}
   */
  getRepos(username, reposName) {
    var self = this;
    return new Promise(function(resolve, reject) {

      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName)) {
        return reject(new Error('Auth Error'));
      }
      self.apiCall('repositories/' + username + '/' + reposName, function(err, response) {
        if(err) return reject(new Error('Error' + err));
        return resolve(response);
      });

    });
  };

  /**
   * Get pull requests List
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Busername%7D/%7BreposName%7D/pullrequests
   * @param {String} username
   * @param {String} reposName - repos name
   * @return {Promise}
   */
  getPullRequests(username, reposName) {
    var self = this;
    return new Promise(function(resolve, reject) {

      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName)) {
        return reject(new Error('Auth Error'));
      }

      self.apiCall('repositories/' + username + '/' + reposName + '/pullrequests', 
                  { state : 'MERGED', sort : '-updated_on' }, 
                  function(err, result) {
        if(err) return reject(err);
        if(utils.isBlank(result.values) || result.values.length == 0) return resolve([]);
        let pulls = [];
        for(let res of result.values) {
          let pr = utils.popItems(res, ['id', 'title']);
          // source commit sha
          pr['number'] = res.id;
          pr['created_at'] = res.created_on;
          pr['updated_at'] = res.updated_on;
          pr['base'] = res.destination.branch.name;
          pr['sha'] = res.merge_commit.hash;
          pr['user'] = {};
          pr['user']['loginname'] = res.author.username;
          pr['user']['avatar'] = res.author.links.avatar.href;
          pulls.push(pr);
        }
        return resolve(pulls);
      });

    });
  };


  /**
   * Get branch list
   * @param {String} username
   * @param {String} reposName - repos name
   * @return {Promise} - Branch list
   */
  getBranches(username, reposName) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName)) {
        return reject(new Error('Auth Error'));
      }

      self.apiCall('repositories/' + username + '/' + reposName + '/refs/branches', function(err, result) {
        if(err) return reject(new Error('Error' + err));

        let branches = [];
        if(utils.isBlank(result.values) || result.values.length == 0) return resolve(branches);
        for(let res of result.values) {
          let br = utils.popItems(res, ['name']);
          br['sha'] = res.target.hash;
          branches.push(br);
        }
        return resolve(branches);
      });

    });
  };

  /**
   * Get commit list from branch sha
   * @param {String} username
   * @param {String} reposName - repos name
   * @param {String} branch - Branch info { name : 'dev01', sha : '0728682' }
   * @return {Promise} - Commit list
   */
  getCommits(username, reposName, branch) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName) || utils.isBlank(branch)) {
        return reject(new Error('Auth Error'));
      }
       
      self.apiCall('repositories/' + username + '/' + reposName + '/commits' 
                    + '/' + branch.name, function(err, result) {
        //console.log('>>>> getCommits/', err, result);              
        if(err) return reject(new Error('Error' + err));
        if(utils.isBlank(result.values) || result.values.length == 0) return resolve([]);
        
        let commits = [];
        for(let c of result.values) {
          let com = { sha : c.hash };
          com['message'] = c.message;
          com['commit_date'] = c.date;
          com['author'] = {};
          com['author']['loginname'] = c.author.raw;
          commits.push(com);
        }
        return resolve(commits);
      });
    });
  };

  /**
   * Download files for pipeline
   * @param {Object} pipeline 
   * @param {Object} connection 
   */
  getFiles(pipeline, connection, logger) {
    const self = this;
    self.pipeline = pipeline;
    self.logger = logger;  // Report process log to 
    self.cacheFiles = [];
    let log = '';
    if(pipeline.type == 'pr') {
      let numbers = [];
      for(let pr of pipeline.prs) {
        numbers.push(pr.number);
      }
      log += '#' + numbers.join(', #');
    } else {
      log += '#' + pipeline.branch.name;
      let shas = [];
      for(let com of pipeline.commits) {
        shas.push(com.sha.substr(0, 10));
      }
      log += ' ' + shas.join(', ');
    }
    self.logger('[Bitbucket] Pull from ' + connection.repos.name + ' (' + log + '):');
    return new Promise(function(resolve, reject) {
      // TODO Remove
      self.getRepos(connection.username, connection.repos.name)
      .then(function(repos){
        //console.log('>>>> getRepos ', repos)
        // Download files
        if(pipeline.type == 'pr') {
          return self.getFilesFromPRs(connection.username, connection.repos.name, pipeline.prs);
        } else if(pipeline.type == 'commit'){
          return self.getFilesFromCommits(connection.username, connection.repos.name, pipeline.commits);
        } else if(pipeline.type == 'branch') {
          // From Branch
          return self.getFilesFromBranch(connection.username, connection.repos.name, pipeline.branch);
        }
      })
      .then(function(success) {
        self.logger('[Bitbucket] Pull Done.');
        return resolve(success);
      })
      .catch(function(err){
        return reject(err);
      });
    });
  }

  /**
   * Get files from multiple pr object
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Busername%7D/%7BreposName%7D/diffstat/%7Bspec%7D
   * @param {String} username
   * @param {String} reposName - repos name
   * @param {Array} pullrequests - Pull Request Object array 
   * @return {Promise}
   */
  getFilesFromPRs(username, reposName, pullrequests) {
    var self = this;
    return new Promise(function(resolve, reject) {

      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName) ) {
        return reject(new Error('Auth Error'));
      }
      let prs = utils.sortPR(pullrequests, true);

      async.eachSeries(prs, function(pr, callback) {
        
        self.logger('[Github] Pull files from #' + pr.number);
        const apiPath = path.join('repositories', username, reposName, 'pullrequests/' + pr.number, 'diffstat');
        self.apiCall(apiPath, function(err, result) {
          if(err) { return reject(err); }

          // Fetch file content to local
          if(Array.isArray(result.values)) {
            async.eachLimit(result.values, 10, function(file, completion) {
              if(file.status != 'modified' && file.status != 'added') {
                return completion(null);
              }
              // is file
              self.fetchFileContent(username, reposName, pr.sha, file.new.path)
              .then(function(success) {
                return completion(null);
              })
              .catch(function(err) {
                return completion(err);
              });
            }, function(err){
              //console.log('>>>> getFilesFromCommits DONE');
              if(err) { return callback(err); }
              return callback(null, true);
            }); // .async.eachSeries
          } else {
            return callback(null, true);
          }

        }); 
      }, function(err){
        //console.log('>>>> getFilesFromCommits DONE');
        if(err) { return reject(err); }
        return resolve(true);
      });

    });
  };

  /**
   * Get files from multiple pr numbers
   * @param {Object} repos - repos object
   * @param {String} branch - Branch info { name : 'dev01', sha : '0728682' }
   * @return {Promise}
   */
  getFilesFromBranch(username, reposName, branch) {
    const self = this;
    self.logger('[Bitbucket] Pull files from branch: #' + branch.name);
    return self.getFilesFromSha(username, reposName, branch, '/')
  }

  getFilesFromSha(username, reposName, branch, filepath) {
    const self = this;
    const metadata = new Metadata();
    return new Promise(function(resolve, reject) {
      const apiPath = path.join('repositories', username, reposName, 'src', branch.sha, filepath);
      // TODO Muitlple pages
      self.apiCall(apiPath, { pagelen : 100 }, function(err, result) {
        if(err) { return reject(err); }
        // Fetch file content to local
        if(Array.isArray(result.values)) {
          // is folder
          async.eachLimit(result.values, 10, function(file, callback) {
            if(file.type == 'commit_directory') {
              // is folder
              self.getFilesFromSha(username, reposName, branch, file.path)
              .then(function() {
                return callback(null);
              })
              .catch(function(err) {
                return callback(err);
              });
              return;
            } 
            // is file, download file's content
            self.fetchFileContent(username, reposName, branch.sha, file.path)
            .then(function(success) {
              return callback(null);
            })
            .catch(function(err) {
              return callback(err);
            });
          }, function(err){
            //console.log('>>>> getFilesFromCommits DONE');
            if(err) { return reject(err); }
            return resolve(true);
          });
        }
      });
    });
  }

  /**
   * Get files from commits in branch
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Busername%7D/%7BreposName%7D/diffstat/%7Bspec%7D
   * @param {String} username
   * @param {String} reposName - repos name
   * @param {Array} commits 
   * @return {Promise}
   */
  getFilesFromCommits(username, reposName, commits) {
    var self = this;
    return new Promise(function(resolve, reject) {

      if (!self.access_token || utils.isBlank(username) || utils.isBlank(reposName) ) {
        return reject(new Error('Auth Error'));
      }

      let sortCommits = utils.sortCommit(commits, true);
      async.eachSeries(sortCommits, function(commit, callback) {

        self.logger('[Bitbucket] Pull files from commit: ' + commit.sha);
        const apiPath = path.join('repositories', username, reposName, 'diffstat', commit.sha);
        self.apiCall(apiPath , function(err, result) {
          //console.log('>>>> apiPath result', result);
          if(err) { return reject(err); }
          // Fetch file content to local
          if(Array.isArray(result.values)) {
            async.eachLimit(result.values, 10, function(file, completion) {
              if(file.status != 'modified' && file.status != 'added') {
                return completion(null);
              }
              // is file
              self.fetchFileContent(username, reposName, commit.sha, file.new.path)
              .then(function(success) {
                return completion(null);
              })
              .catch(function(err) {
                return completion(err);
              });
            }, function(err){
              //console.log('>>>> getFilesFromCommits DONE');
              if(err) { return callback(err); }
              return callback(null, true);
            }); // .async.eachSeries
          } else {
            return callback(null, true);
          }

        }); 
      }, function(err){
        //console.log('>>>> getFilesFromCommits DONE');
        if(err) { return reject(err); }
        return resolve(true);
      });

    });
  };

  /**
   * Fetch files content to local
   * @param {String} username
   * @param {String} reposName - repos name
   * @param {String} sha - Branch / PR / Commit sha
   * @param {Array} files - the files to fetch
   * @return {Promise}
   */    
  fetchFileContent(username, reposName, sha, filePath) {
    const self = this;
    return new Promise(function(resolve, reject) {
      //console.log('>>>> download files', filePath);
      let filename = path.basename(filePath);
      let filedir = path.dirname(filePath);
      //const extension = filename.split('.').pop();
      filename = utils.getFileName(filename);
      // ignore blank file, file out of src folder, cached file
      if(utils.isBlank(filename) || utils.isBlank(filedir) || !filePath.startsWith('src/') || self.cacheFiles.indexOf(filePath) >= 0) {
        // eg, .gitignore
        self.logger('        > ' + filePath + ' (Ignored)');
        return resolve(null);
      }
      self.cacheFiles.push(filePath);
      // TODO move to metadata as a common function
      const metadata = new Metadata();
      const localPath = metadata.makeDir(self.pipeline.id, filePath);
      const fileContentUri = path.join('repositories', username, reposName, 'src', sha, encodeURIComponent(filePath) + '?raw');
      self.apiCall(fileContentUri, {})
      .on('response', function(response) {
        if(utils.isBlank(response.statusCode) || response.statusCode != '200') {
          self.logger('        > ' + filePath + ' (ERROR: not found)');
          return resolve(true);
        }
        let contentLength = 0;
        response.on('data', function(content) {
          if(utils.isNotBlank(content)) contentLength += content.length;
        });
        metadata.saveFileStream(localPath, response, function(success) {
          self.logger('        > ' + filePath + ' (Size: ' + contentLength + ')');
          return resolve(success);
        })
      })
      .on('error', function(err) {
        return reject(err);
      });

    });
  }

  apiCall(apiName, opts, callback) {
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    const params = {
      headers: {
        Authorization: ' Bearer ' + this.access_token
      },
      qs: opts,
      url: CLIENT.BITBUCKET_API + '/' + apiName,
      json: true,
    };
    if(CONFIG.DEBUG_MODE) console.log('[APICALL] params', params);
    if(!callback) {
      // Return Promise
      return request.get(params);
    }
    request.get(params, function(err, body, res) {
      //if(CONFIG.DEBUG_MODE) console.log('[APICALL] response', res);
      callback(err, res);
    });
  }

}

module.exports = BitbucketApi;