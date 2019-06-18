const { assert, expect } = require('chai')

const helper = require('../test-helper');
const Connect = require('../../src/class/Connect');
const connect = new Connect();

describe('class Connect.js', function () {
  this.timeout(15000);

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  // Make sure there has at least 1 open pull request in your repository
  it('should get pull requests via github api', function (done) {
    let connection = helper.getGitConnect();
    helper.send('git-pullrequests', connection, function (event, arg) {
      connect.getPullRequests(event, arg);
    })
    .then(function(prs) {
      assert.isArray(prs);
      assert.isString(prs[0].sha);
      done();
    });
  });

  it('should get branches via github api, then get commits by branch name', function (done) {
    let connection = helper.getGitConnect();
    helper.send('git-branches', connection, function (event, arg) {
      connect.getBranches(event, arg);
    })
    .then(function(branches) {
      //console.log('[DEBUG] branches', branches);
      assert.isArray(branches);
      assert.isString(branches[0].name);
      return helper.send('git-branch-commits', { connection : connection, branch : branches[0] }, function (event, arg) {
        connect.getCommits(event, arg);
      });
    })
    .then(function(commits) {
      //console.log('[DEBUG] commits', commits);
      assert.isArray(commits);
      assert.isString(commits[0].sha);
      done();
    });
  });

  it('should get metadata list via sfdc api', function (done) {
    // Increase timeout to 60s
    this.timeout(60000);

    let connection = helper.getSfdcConnect();
    helper.send('sfdc-metadata-list', {connection : connection}, function (event, arg) {
      connect.getMetadataList(event, arg);
    })
    .then(function(result) {
      //console.log('[DEBUG] metadata', result.types);
      assert.isObject(result);
      assert.isObject(result.components);
      assert.isObject(result.types);
      assert.isString(result.types.CustomObject);
      done();
    });
  });

});