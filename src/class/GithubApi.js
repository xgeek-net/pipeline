//Module Docs  @see https://github.com/github-tools/github
//API Docs @see https://developer.github.com/v3
const GitHub = require('github-api');
const request = require('request');
const async = require('async');
const path = require('path');
const url = require('url');
const qs = require('querystring');

const CLIENT = require('../config/client');
const utils = require('./Utils.js');
const Metadata = require('./Metadata.js');

class GithubApi {
  constructor(opts) {
    opts = opts || {};
    this.api = null;
    if(opts.access_token) {
      this.api = new GitHub({token : opts.access_token});
    }
    // Pipeline info object
    this.pipeline = null; 
    // Pipeline process logger
    this.logger = null; 
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
          if(utils.isBlank(result) || result.length == 0) return resolve([]);
          return resolve(result);
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
   * @param {String} sha - Branch sha or branch name
   * @return {Promise} - Commit list
   */
  getCommits(username, reposName, branchName) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.getRepos(username, reposName)
      .then(function(repos){
        //console.log('>>> repos', repos);
        repos.listCommits({sha: branchName}, function(err, result) {
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
            console.log('>>> listCommits com', com);
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
    let log = '';
    if(pipeline.type == 'pr') {
      log += '#' + pipeline.prs.join(', #');
    } else {
      log += '#' + pipeline.branch + ' ' + pipeline.commits.join(', ');
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
          return self.getFilesFromCommits(repos, pipeline.branch, pipeline.commits);
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
  getFilesFromPRs(repos, prs) {
    const self = this;
    return new Promise(function(resolve, reject) {
      let numbers = utils.sort(prs);
      //console.log('>>>> numbers ', numbers, Array.isArray(numbers));
      async.eachSeries(numbers, function(number, callback) {

        self.logger('[Github] Pull files from #' + number);
        repos.listPullRequestFiles(number, function(err, files) {
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
   * @param {String} branchName - Branch name
   * @return {Promise}
   */
  getFilesFromBranch(repos, branchName) {
    const self = this;
    self.logger('[Github] Pull files from branch: #' + branchName);
    return self.getFilesFromSha(repos, branchName, '')
  }

  getFilesFromSha(repos, branchName, filepath) {
    const self = this;
    const metadata = new Metadata();
    return new Promise(function(resolve, reject) {
      repos.getSha(branchName, filepath, function(err, result) {
        if(err) { return reject(err); }
        // Fetch file content to local
        if(Array.isArray(result)) {
          // is folder
          async.eachSeries(result, function(file, callback) {
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
            let filename = path.basename(file.path);
            filename = utils.getFileName(filename);
            if(utils.isBlank(filename)) {
              // eg, .gitignore
              return callback(null);
            }
            repos.getContents(branchName, file.path, true, function(err, content) {
              self.logger('        > ' + file.path + ' (Size: ' + content.length + ')');
              // Save file content
              metadata.saveSingleFile(self.pipeline.id, file.path, content)
              .then(function(success) {
                //console.log('>>>> download', file.filename, 'completed');
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
      //console.log('>>>> commits ', branchName, commits);
      async.eachSeries(commits, function(shaOfCommit, callback) {

        self.logger('[Github] Pull files from commit: ' + shaOfCommit);
        repos.getSingleCommit(shaOfCommit, function(err, result) {
          if(err) { return reject(err); }
          //console.log('>>>> result', shaOfCommit, result);
          // Fetch file content to local
          self.fetchFilesContent(repos, result.files)
          .then(function(success) {
            //console.log('>>>> get commit', shaOfCommit, 'completed');
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
    return new Promise(function(resolve, reject) {
      //console.log('>>>> download files', files.length);
      async.eachSeries(files, function(file, callback) {
        //console.log('>>>> download', file.filename);
        let filename = path.basename(file.filename);
        filename = utils.getFileName(filename);
        if(utils.isBlank(filename)) {
          // eg, .gitignore
          return callback(null);
        }
        const urlObj = url.parse(file.contents_url);
        const params = qs.parse(urlObj.query);
        const ref = params.ref;
        repos.getContents(ref, file.filename, true, function(err, content) {
          self.logger('        > ' + file.filename + ' (Size: ' + content.length + ')');
          // Save file content
          metadata.saveSingleFile(self.pipeline.id, file.filename, content)
          .then(function(success) {
            //console.log('>>>> download', file.filename, 'completed');
            return callback(null);
          })
          .catch(function(err) {
            return callback(err);
          });
        });
      }, function(err){
        //console.log('>>>> download completed', err);
        if(err) { return reject(err); }
        return resolve(true);
      });
    });
  }

}

module.exports = GithubApi;