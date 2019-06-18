const { assert, expect } = require('chai')

const helper = require('../test-helper');
const Pipeline = require('../../src/class/Pipeline');
const Connect = require('../../src/class/Connect');

const pipeline = new Pipeline();
const connect = new Connect();
const CONNECT_FILE_NAME = 'connect.json';
const PIPLINE_FILE_NAME = 'pipeline.json';
const PIPELINE_FOLDER = 'pipeline';

describe('class Pipeline.js', function () {
  this.timeout(15000);

  before(function (done) {
    helper.clearData(CONNECT_FILE_NAME);
    helper.clearData(PIPLINE_FILE_NAME);
    helper.clearData(PIPELINE_FOLDER);
    done();
  });

  after(function (done) {
    helper.clearData(CONNECT_FILE_NAME);
    helper.clearData(PIPLINE_FILE_NAME);
    helper.clearData(PIPELINE_FOLDER);
    done();
  });

  it('should create a pipeline', function (done) {
    let fromConnId, toConnId;
    let gitConn = helper.getGitConnect();
    // Create github connection
    helper.send('data-new-connection', {connect : gitConn}, function (event, arg) {
      connect.newConnect(event, arg);
    })
    .then(function(connections) {
      let sfdcConn = helper.getSfdcConnect();
      // Create sfdc connection
      return helper.send('data-new-connection', {connect : sfdcConn}, function (event, arg) {
        connect.newConnect(event, arg);
      });
    }).then(function(connections) {
      assert.isArray(connections);
      for(let i = 0; i < connections.length; i++) {
        if(connections[i].type == 'github') fromConnId = connections[i].id;
        if(connections[i].type == 'sfdc') toConnId = connections[i].id;
      }
      assert.isString(fromConnId);
      assert.isString(toConnId);
      let githubPipeline = helper.getGtihubPipeline(fromConnId, toConnId);
      // Create github pipeline
      return helper.send('data-save-pipeline', {pipeline : githubPipeline}, function (event, arg) {
        pipeline.savePipeline(event, arg);
      }).then(function(res) {
        assert.isString(res.id);
        done();
      });
    });
  });

  it('should get pipeline list data, then clone pipeline, then remove the cloned pipeline', function (done) {
    helper.send('data-pipelines', {}, function (event, arg) {
      pipeline.getPipelines(event, arg);
    })
    .then(function(pipelines) {
      assert.isArray(pipelines);
      let target = pipelines[0];
      assert.isString(target.id);
      // Clone pipeline
      return helper.send('data-clone-pipeline', {id : target.id}, function (event, arg) {
        pipeline.clonePipeline(event, arg);
      });
    })
    .then(function(res) {
      assert.isString(res.id);
      // Remove cloned pipeline
      return helper.send('data-remove-pipeline', {id : res.id}, function (event, arg) {
        pipeline.removePipeline(event, arg);
      });
    })
    .then(function(res) {
      assert.isString(res.id);
      done();
    });
  });

  it('should run pipepline, then get pipeline log and export metadata file', function (done) {
    // Increase timeout to 60s
    this.timeout(60000);

    let pipId, deployResult;
    helper.send('data-pipelines', {}, function (event, arg) {
      pipeline.getPipelines(event, arg);
    })
    .then(function(pipelines) {
      assert.isArray(pipelines);
      pipId = pipelines[0].id;
      // Clone pipeline
      return helper.send('pipeline-run', {id : pipId}, function (event, arg) {
        pipeline.runPipeline(event, arg);
      });
    })
    .then(function(result) {
      deployResult = result;
      //console.log('[DEBUG] deployResult', deployResult);
      assert.isObject(deployResult);
      assert.isString(deployResult.id);
      expect(deployResult.success).to.equal(true);
      expect(deployResult.status).to.equal('Succeeded');

      // Get pipeline log
      return helper.send('data-pipeline-log', {id : pipId}, function (event, arg) {
        pipeline.getPipelineLog(event, arg);
      });
    })
    .then(function(res) {
      assert.isObject(res);
      assert.isString(res.body);
      assert.isObject(res.deployResult);
      expect(deployResult.id).to.equal(res.deployResult.id);

      // Export metadata.zip file
      return helper.send('data-pipeline-export-metadata', {id : pipId}, function (event, arg) {
        pipeline.exportMetadata(event, arg);
      });
    })
    .then(function(res) {
      assert.isObject(res);
      assert.isString(res.data);
      done();
    });
  });
});