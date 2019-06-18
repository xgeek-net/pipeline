//https://www.nodegit.org/api/
const async = require('async');
const path = require('path');
const fse = require('fs-extra');
const Crypto = require('crypto-js');
// Skip test in mocha, (TODO) fix below error: 
// dyld: lazy symbol binding failed: Symbol not found
const NodeGit = (process.env.NODE_ENV !== 'test') ? require('nodegit') : null;

const CLIENT = require('../config/client');
const Metadata = require('./Metadata');
const utils = require('./Utils');

class GitApi {
  constructor(opts) {
    opts = opts || {};
    this.id = opts.id;
    this.url = opts.git_url;
    this.username = opts.username;
    if(opts.password) {
      this.password = Crypto.AES.decrypt(opts.password, CLIENT.SECRET_KEY).toString(Crypto.enc.Utf8);
    }
    // Pipeline process logger
    this.repos = null; 
  }

  // Get repository
  checkToken(connection) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.getRepos()
      .then(function(repo) {
        self.repos = repo;
        return resolve(true)
      })
      .catch(function (err) {
        return reject(err);
      });
    });
  }

  /**
   * Get git local path 
   * @param {String} pipeline / null 
   */
  getGitFolder(directory) {
    let userDataPath = utils.getUserDataPath();
    if(directory) userDataPath = path.join(userDataPath, directory);
    const localPath = path.join(userDataPath, 'git');
    if(!fse.pathExistsSync(localPath)) {
      fse.ensureDirSync(localPath, '0777');
    }
    return localPath;
  }

  /**
   * Open local repostory, or Clone it if not exist
   * @return {Object} Promise
   */
  getRepos() {
    const self = this;
    const localPath = self.getGitFolder();
    const gitPath = path.join(localPath, self.id);
    
    if(fse.pathExistsSync(gitPath)) {
      // Open respostory if folder exists
      return self.openRepos(gitPath);
    }
    return self.cloneRepos(gitPath);
  }

  
  openRepos(gitPath) {
    const self = this;
    let repos = null;
    return new Promise(function(resolve, reject) {
      NodeGit.Repository
      .open(path.resolve(gitPath, '.git'))
      .then(function(repo) {
        repos = repo;
        return repos.fetchAll({
          callbacks: {
            credentials: function(url, userName) {
              return NodeGit.Cred.userpassPlaintextNew(self.username, self.password)
            },
            certificateCheck: function() {
              return 1;
            }
          }
        });
      })
      .then(function() {
        return resolve(repos);
      })
      .catch(function(err) {
        return reject(err);
      });
    });
  }

  /**
   * Clone git repository
   * @param {String} gitPath 
   * @return {Object} Promise
   */
  cloneRepos(gitPath) {
    const self = this;
    let cloneAttempts = 0;
    const cloneOptions = {
      fetchOpts: {
        callbacks: {
          credentials: function (url, userName) {
            if(cloneAttempts > 0) {
              return Git.Cred.defaultNew();
            }
            cloneAttempts++;
            return NodeGit.Cred.userpassPlaintextNew(self.username, self.password)
          }
        }
      }
    }
    // Clone
    return NodeGit.Clone(self.url, gitPath, cloneOptions);
  }

  /**
   * Remove local git 
   */
  clearRepos() {
    const self = this;
    const localPath = self.getGitFolder();
    const gitPath = path.join(localPath, self.id);
    
    if(fse.pathExistsSync(gitPath)) {
      fse.removeSync(gitPath);
    }
  }

  /**
   * List branches
   * @return {Object} Promise
   */
  getBranches() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.repos.getReferenceNames(NodeGit.Reference.TYPE.LISTALL)
      .then(function(branchNames) {
        let remoteBraches = [];
        for(let i = 0; i < branchNames.length; i++) {
          if(!branchNames[i].startsWith('refs/remotes/origin/')) continue;
          let brName = branchNames[i].replace('refs/remotes/origin/', '');
          remoteBraches.push({ name : brName });
        }
        return resolve(remoteBraches);
      })
      .catch(function(err) {
        console.error('[ERROR]', err);
        return reject(err);
      }); // .getReferenceNames
    })
  }

  /**
   * List commits of branch
   * @param {String} remoteBranchName
   * @return {Object} Promise
   */
  getCommits(remoteBranchName, count) {
    const self = this;
    count = count || 100;
    return new Promise(function(resolve, reject) {
      self.repos.getReferenceCommit(
        "refs/remotes/origin/" + remoteBranchName)
      .then(function (commit) {
        let walker = self.repos.createRevWalk();
        // Sort Desc
        walker.sorting(NodeGit.Revwalk.SORT.NONE);
        walker.push(commit.id());	// places us at the last commit

        return walker.getCommits(count);
      })
      .then(function (results) {
        let commits = [];
        for(let i = 0; i < results.length; i++) {
          let c = results[i];
          let com = {};
          com['sha'] = c.sha();
          com['message'] = c.message();
          com['commit_date'] = c.date();
          com['author'] = {};
          com['author']['name'] = c.author().name();
          com['author']['loginname'] = c.author().email();
          commits.push(com);
        }
        return resolve(commits);
      }).catch(function(err) {
        console.error('[ERROR]', err);
        return reject(err);
      });
    });
  }

  /**
   * Download files for pipeline
   * @param {Object} pipeline 
   * @param {Object} connection 
   * @return {Object} Promise
   */
  getFiles(pipeline, connection, logger) {
    const self = this;
    self.pipeline = pipeline;
    self.logger = logger;  // Report process log to 
    self.cacheFiles = [];
    const gitPath = self.getGitFolder(path.join('pipeline', pipeline.id));
    let log = '';
    log += '#' + pipeline.branch.name;
    let shas = [];
    for(let com of pipeline.commits) {
      shas.push(com.sha.substr(0, 10));
    }
    log += ' ' + shas.join(', ');
    self.logger('[Git] Clone from ' + connection.git_url + ' (' + log + '):');
    return new Promise(function(resolve, reject) {
      self.cloneRepos(gitPath)
      .then(function(repo){
        self.repos = repo;
        // Download files
        if(pipeline.type == 'commit') {
          return self.getFilesFromCommits(pipeline.commits);
        } else if(pipeline.type == 'branch') {
          // From Branch
          return self.getFilesFromBranch(pipeline.branch.name);
        }
      })
      .then(function(success) {
        // Release repo, fix unlink EPERM error in windows
        self.repos.cleanup();
        self.repos = null;
        // Clear local git folder
        fse.removeSync(gitPath);
        self.logger('[Git] Pull Done.');
        return resolve(success);
      })
      .catch(function(err){
        return reject(err);
      });
    });
  }

  /**
   * Pull files from commits
   * @param {Object} commits 
   */
  getFilesFromCommits(commits) {
    const self = this;
    const repos = self.repos;
    return new Promise(function(resolve, reject) {
      let sortCommits = utils.sortCommit(commits, true);
      async.eachSeries(sortCommits, function(commit, callback) {
        self.listDiff(commit.sha)
        .then(function(patches) {
          return self.getCommitFiles(commit.sha, patches);
        })
        .then(function(success) {
          return callback();
        })
        .catch(function(err){
          return reject(err);
        });
      }, function(err){
        if(err) { return reject(err); }
        return resolve(true);
      }); //.async.eachSeries
    });
  }

  // Save Blob to file
  // https://stackoverflow.com/questions/39395195/how-to-write-wav-file-from-blob-in-javascript-node
  getCommitFiles(sha, patches) {
    const self = this;
    const repos = self.repos;
    const rootDir = self.pipeline.path;
    const metadata = new Metadata();
    self.logger('[Git] Pull files from commit: ' + sha);
    return new Promise(function(resolve, reject) {
      async.eachSeries(patches, function(patch, callback) {
        const patchPath = patch.newFile().path();
        let fileName = patchPath;
        if(rootDir) fileName = fileName.replace(path.join(rootDir, '/'), '');
        let filePath = metadata.makeDir(self.pipeline.id, fileName);
        if(utils.isBlank(fileName) || !fileName.startsWith('src/') || self.cacheFiles.indexOf(fileName) >= 0) {
          self.logger('        > ' + patchPath + ' (Ignored)');
          return callback(null);
        }
        // Pull file from commit sha
        repos.getCommit(sha)
        .then(function(commit) {
          return commit.getEntry(patch.newFile().path());
        })
        .then(function(entry) {
          // Ignore folder
          if(!entry.isFile()) return callback();
          let fileDir = path.dirname(filePath);
          if(!fse.pathExistsSync(fileDir)) {
            fse.ensureDirSync(fileDir, '0777');
          }
          return entry.getBlob();
        })
        .then(function(blob) {
          const fileContent = blob.toString();
          // Cache file
          const contentLength = fileContent.length;
          self.logger('        > ' + patchPath + ' (Size: ' + contentLength + ')');
          self.cacheFiles.push(fileName);
          
          return fse.writeFile(filePath, blob.toString(), callback); 
        })
        .catch(function(err){
          return callback(err);
        });
      }, function(err){
        if(err) { return reject(err); }
        return resolve(true);
      }); //.async.eachSeries
    });
  }

  /**
   * Pull files from remote brach
   * @param {String} branchName 
   */
  getFilesFromBranch(branchName) {
    const self = this;
    const metadata = new Metadata();
    const repos = self.repos;
    
    self.logger('[Git] Pull files from branch: #' + branchName);
    return new Promise(function(resolve, reject) {
      repos.getHeadCommit()
      .then(function (targetCommit) {
        // skip create when pull from master branch
        if(branchName == 'master') return null;
        return repos.createBranch(branchName, targetCommit, false);
      })
      .then(function (reference) {
        if(!reference) return true;
        return repos.checkoutBranch(reference, {});
      })
      .then(function () {
        return repos.getReferenceCommit(
          "refs/remotes/origin/" + branchName);
      })
      .then(function (commit) {
        //console.log('[4]commit',commit.toString(), commit.id(), commit.author().name(), commit.message());
        NodeGit.Reset.reset(repos, commit, 3, {});
      })
      .then(function (success) {
        // Copy metadata from git folder to metadata folder
        let gitPath = self.getGitFolder(path.join('pipeline', self.pipeline.id));
        const rootDir = self.pipeline.path;
        if(rootDir) gitPath = path.join(gitPath, rootDir);
        let metaPath = metadata.getMetadataFolder(self.pipeline.id);
        fse.copy(gitPath, metaPath, function(err){
          if (err) return reject(err);
          return resolve(success);
        });
      })
      .catch(function(err){
        return reject(err);
      });
    });
  }

  /**
   * 
   * @param {String} sha 
   *  @return {Object} Promise
   */
  listDiff(sha) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.repos.getCommit(sha)
      .then(function (commit) {
        return commit.getDiff();
      })
      .then(function(diffList) {
        let patches = [];
        async.eachSeries(diffList, function(diff, callback) {
          diff.patches().then(function(results) {
            for(let i = 0; i < results.length; i++) {
              patches.push(results[i]);
            }
            callback();
          });
        }, function(err){
          if(err) { return reject(err); }
          return resolve(patches);
        }); //.async.eachSeries
        
      })
      .catch(function(err) {
        console.error('[ERROR]', err);
        return reject(err);
      });
    });
  }

}

module.exports = GitApi;