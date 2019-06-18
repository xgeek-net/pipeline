//Module Docs  @see https://github.com/github-tools/github
//API Docs @see https://developer.github.com/v3
const GitHub = require('github-api');
const axios = require('axios');
const request = require('request');
const async = require('async');
const path = require('path');
const url = require('url');
const qs = require('querystring');

const CONFIG = require('../config/config');
const CLIENT = require('../config/client');
const utils = require('./Utils');
const Metadata = require('./Metadata');

class GithubApi {
  constructor(opts) {
    opts = opts || {};
    this.api = null;
    if(opts.access_token) {
      this.api = new GitHub({token : opts.access_token});
      this.access_token = opts.access_token;
    }
    // Pipeline info object
    this.pipeline = null; 
    // Pipeline process logger
    this.logger = null; 
    // Pipeline downloaded file list
    this.cacheFiles = null;
  }

  getAuthUrl() {
    const url = CLIENT.GITHUB_END_POINT + '/authorize'
        + '?client_id=' + CLIENT.GITHUB_CLIENT_ID
        + '&scope=user%20repo'
        + '&redirect_uri=' + encodeURIComponent(CLIENT.GITHUB_CALLBACK_URL)
        + '&state=' + CLIENT.GITHUB_STATE;
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
    const tokenUrl = CLIENT.GITHUB_END_POINT + '/access_token'
      + '?client_id=' + CLIENT.GITHUB_CLIENT_ID
      + '&client_secret=' + CLIENT.GITHUB_CLIENT_SECRET
      + '&code=' + code
      + '&state=' + CLIENT.GITHUB_STATE;
    request.get({url:tokenUrl, json: true}, function (err, body, token) {
      //console.log('>>>> request result ', err, token);
      if(err) return callback(err);

      resp = token;
      self.api = new GitHub({token : token.access_token});
      const me = self.api.getUser();
      // Request profile
      me.getProfile(function(err, profile){
        if(err) return callback(err);

        resp['avatar'] = profile.avatar_url;
        resp['username'] = profile.name;
        resp['loginname'] = profile.login;
        // List repository
        me.listRepos({type : 'all'}, function(err, repos){
          if(err) return callback(err);
          resp['repos'] = [];
          for(let rep of repos) {
            resp.repos.push({
              id : rep.id,
              name : rep.name,
              full_name : rep.full_name,
              private : rep.private
            });
          }
          //console.log('>>>> request listRepos ', err, resp);
          callback(err, resp);
        })

      });
    })
  }

  /**
   * Validate access token
   * @param {Object} connetion
   * @param {Function} callback 
   */
  checkToken(connetion) {
    // TODO validate Token
    return Promise.resolve(true);
  }

  /**
   * Get repository object
   * @param {String} username - github login name
   * @param {String} reposName - name
   * @return {Promise}
   */
  getRepos(username, reposName) {
    const self = this;
    return new Promise(function(resolve, reject) {
      if (!self.api || utils.isBlank(username) || utils.isBlank(reposName)) {
        return reject(new Error('Auth Error'));
      }
      const repos = self.api.getRepo(username, reposName);
      return resolve(repos);
    });
  };

  /**
   * Get pull requests List
   * @param {String} username - github login name
   * @param {String} reposName - repos name
   * @param {Object} filters - options to filter the search
   * @return {Promise} Pull Request list
   */
  getPullRequests(username, reposName, filters) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.getRepos(username, reposName)
      .then(function(repos){
        //console.log('>>> repos', repos);
        repos.listPullRequests(filters, function(err, result) {
          if(err) return reject(err);
          //console.log('>>> listPullRequests result', result);
          if(utils.isBlank(result) || result.length == 0) return resolve([]);
          let pulls = [];
          for(let res of result) {
            let pr = utils.popItems(res, ['id', 'number', 'title', 'created_at', 'updated_at']);
            //console.log('>>> pr', pr, res.base.ref, res.user.login, res.user.avatar_url);
            pr['base'] = res.base.ref;
            pr['sha'] = res.merge_commit_sha;
            pr['user'] = {};
            pr['user']['loginname'] = res.user.login;
            pr['user']['avatar'] = res.user.avatar_url;
            pulls.push(pr);
          }
          return resolve(pulls);
        });
      })
      .catch(function(err){
        return reject(err);
      });
    });
  };

  /**
   * Get branches list
   * @param {String} username - github login name
   * @param {String} reposName - repos name
   * @return {Promise} - Branch list
   */
  getBranches(username, reposName) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.getRepos(username, reposName)
      .then(function(repos){
        //console.log('>>> repos', repos);
        repos.listBranches(function(err, result) {
          if(err) return reject(err);
          let branches = [];
          if(utils.isBlank(result) || result.length == 0) return resolve(branches);
          for(let res of result) {
            let br = utils.popItems(res, ['name']);
            br['sha'] = '';
            branches.push(br);
          }
          return resolve(branches);
        });
      })
      .catch(function(err){
        return reject(err);
      });
    });
  };

  /**
   * Get commit list from branch sha
   * @param {String} username - github login name
   * @param {String} reposName - repos name
   * @param {String} branch - Branch object { name : 'branchname', sha : '' }
   * @return {Promise} - Commit list
   */
  getCommits(username, reposName, branch) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.getRepos(username, reposName)
      .then(function(repos){
        //console.log('>>> repos', repos);
        repos.listCommits({sha: branch.name}, function(err, result) {
          if(err) return reject(err);
          if(utils.isBlank(result) || result.length == 0) return resolve([]);
          let commits = [];
          for(let c of result) {
            let com = utils.popItems(c, ['sha']);
            com['message'] = c.commit.message;
            com['commit_date'] = c.commit.author.date;
            com['author'] = {};
            com['author']['loginname'] = c.author.login;
            com['author']['avatar'] = c.author.avatar_url;
            commits.push(com);
            //console.log('>>> listCommits com', com);
          }
          return resolve(commits);
        });
      })
      .catch(function(err){
        return reject(err);
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
    self.logger('[Github] Pull from ' + connection.repos.name + ' (' + log + '):');
    return new Promise(function(resolve, reject) {
      self.getRepos(connection.loginname, connection.repos.name)
      .then(function(repos){
        //console.log('>>>> getRepos ', repos)
        // Download files
        if(pipeline.type == 'pr') {
          return self.getFilesFromPRs(repos, pipeline.prs);
        } else if(pipeline.type == 'commit') {
          return self.getFilesFromCommits(repos, pipeline.commits);
        } else if(pipeline.type == 'branch') {
          // From Branch
          return self.getFilesFromBranch(repos, pipeline.branch);
        }
      })
      .then(function(success) {
        self.logger('[Github] Pull Done.');
        return resolve(success);
      })
      .catch(function(err){
        return reject(err);
      });
    });
  }

  /**
   * Get files from multiple pr numbers
   * @param {Object} repos - repos object
   * @param {Array} prs - Pull Request array 
   * @return {Promise}
   */
  getFilesFromPRs(repos, pullrequests) {
    const self = this;
    return new Promise(function(resolve, reject) {
      let prs = utils.sortPR(pullrequests, true);
      //console.log('>>>> numbers ', numbers, Array.isArray(numbers));
      async.eachSeries(prs, function(pr, callback) {

        self.logger('[Github] Pull files from #' + pr.number);
        repos.listPullRequestFiles(pr.number, function(err, files) {
          if(err) return callback(err);
          //console.log('>>>> list files ', files);
          // Fetch file content to local
          self.fetchFilesContent(repos, files)
          .then(function(err, success) {
            if(err) return callback(err);
            return callback(null);
          })
          .catch(function(err) {
            return callback(err);
          });
        });
      }, function(err){
        if(err) { return reject(err); }
        return resolve(true);
      });
    });
  }

  /**
   * Get files from multiple pr numbers
   * @param {Object} repos - repos object
   * @param {String} branch - Branch info { name : 'dev01', sha : '0728682' }
   * @return {Promise}
   */
  getFilesFromBranch(repos, branch) {
    const self = this;
    self.logger('[Github] Pull files from branch: #' + branch.name);
    return self.getFilesFromSha(repos, branch.name, '');
  }

  getFilesFromSha(repos, branchName, filepath) {
    const self = this;
    const metadata = new Metadata();
    const rootDir = self.pipeline.path;
    return new Promise(function(resolve, reject) {
      // TODO Muitlple pages
      repos.getSha(branchName, filepath, function(err, result) {
        if(err) { return reject(err); }
        // Fetch file content to local
        if(Array.isArray(result)) {
          // is folder
          async.eachLimit(result, 10, function(file, callback) {
            if(file.type == 'dir') {
              // is folder
              self.getFilesFromSha(repos, branchName, file.path)
              .then(function() {
                return callback(null);
              })
              .catch(function(err) {
                return callback(err);
              });
              return;
            } 
            // is file
            let fileName = file.path;
            if(rootDir) fileName = fileName.replace(path.join(rootDir, '/'), '');
            let fileNameOnly = path.basename(fileName);
            let filedir = path.dirname(fileName);
            fileNameOnly = utils.getFileName(fileNameOnly);

            // ignore blank file, file out of src folder, cached file
            if(utils.isBlank(fileNameOnly) || utils.isBlank(filedir) || !filedir.startsWith('src/') || self.cacheFiles.indexOf(fileName) >= 0) {
              self.logger('        > ' + file.path + ' (Ignored)');
              return callback(null);
            }
            self.cacheFiles.push(fileName);

            const localPath = metadata.makeDir(self.pipeline.id, fileName)
            const fileContentUri = path.join('repos', repos.__fullname, 'contents', file.path);
            self.fileApiCall(fileContentUri, { ref : branchName })
            .then(function(response) {
              if(utils.isBlank(response.status) || response.status != 200) {
                self.logger('        > ' + file.path + ' (ERROR: not found)');
                return callback(null);
              }
              let contentLength = 0;
              response.data.on('data', function(content) {
                if(utils.isNotBlank(content)) contentLength += content.length;
              });
              metadata.saveFileStream(localPath, response.data, function(success) {
                self.logger('        > ' + file.path + ' (Size: ' + contentLength + ')');
                return callback(null);
              })
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
   * @param {Object} repos - repos object
   * @param {Array} commits 
   */
  getFilesFromCommits(repos, commits) {
    const self = this;
    return new Promise(function(resolve, reject) {
      let sortCommits = utils.sortCommit(commits, true);
      async.eachSeries(sortCommits, function(commit, callback) {

        self.logger('[Github] Pull files from commit: ' + commit.sha);
        repos.getSingleCommit(commit.sha, function(err, result) {
          if(err) { return reject(err); }
          //console.log('>>>> result', commit.sha, result);
          // Fetch file content to local
          self.fetchFilesContent(repos, result.files)
          .then(function(success) {
            //console.log('>>>> get commit', commit.sha, 'completed');
            return callback(null);
          })
          .catch(function(err) {
            return callback(err);
          });
        });
      }, function(err){
        //console.log('>>>> getFilesFromCommits DONE');
        if(err) { return reject(err); }
        return resolve(true);
      });
    });
  }

  /**
   * Fetch files content to local
   * @see https://developer.github.com/v3/repos/contents/#get-contents
   * @param {Object} repos - repos object
   * @param {Array} files - the files to fetch
   * @return {Promise}
   */    
  fetchFilesContent(repos, files) {
    const self = this;
    const metadata = new Metadata();
    const rootDir = self.pipeline.path;
    return new Promise(function(resolve, reject) {
      //console.log('>>>> download files', files.length);
      async.eachLimit(files, 10, function(file, callback) {
        //console.log('>>>> download', file.filename);
        let fileName = file.filename;
        if(rootDir) fileName = fileName.replace(path.join(rootDir, '/'), '');
        let fileNameOnly = path.basename(fileName);
        let filedir = path.dirname(fileName);
        fileNameOnly = utils.getFileName(fileNameOnly);
        // ignore blank file, file out of src folder, cached file
        if(utils.isBlank(fileNameOnly) || utils.isBlank(filedir) || !filedir.startsWith('src/') || self.cacheFiles.indexOf(fileName) >= 0) {
          self.logger('        > ' + file.filename + ' (Ignored)');
          return callback(null);
        }
        self.cacheFiles.push(fileName);

        const urlObj = url.parse(file.contents_url);
        const params = qs.parse(urlObj.query);
        const ref = params.ref;

        // TODO move to metadata as a common function
        const metadata = new Metadata();
        const localPath = metadata.makeDir(self.pipeline.id, fileName);
        const fileContentUri = path.join('repos', repos.__fullname, 'contents', file.filename);
        self.fileApiCall(fileContentUri, { ref : ref })
        .then(function(response) {
          if(utils.isBlank(response.status) || response.status != 200) {
            self.logger('        > ' + file.filename + ' (ERROR: not found)');
            return callback(null);
          }
          let contentLength = 0;
          response.data.on('data', function(content) {
            if(utils.isNotBlank(content)) contentLength += content.length;
          });
          metadata.saveFileStream(localPath, response.data, function(success) {
            self.logger('        > ' + file.filename + ' (Size: ' + contentLength + ')');
            return callback(null);
          })
        })
        .catch(function(err) {
          return callback(err);
        });
      }, function(err){
        //console.log('>>>> download completed', err);
        if(err) { return reject(err); }
        return resolve(true);
      });
    });
  }

  // Download file with stream, 
  // to fix binary file (static resource) download bug.
  fileApiCall(apiName, opts) {
    const config = {
      url: 'https://api.github.com/' + apiName,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/vnd.github.v3.raw+json',
        'Authorization': 'token ' + this.access_token
      },
      params: opts || {},
      responseType: 'stream',
   };
   if(CONFIG.DEBUG_MODE) console.log('[APICALL] params', config);
   const requestPromise = axios(config);
   return requestPromise;
  }

}

module.exports = GithubApi;