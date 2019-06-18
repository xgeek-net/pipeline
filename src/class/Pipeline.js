const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const moment = require('moment');
const Raven = require('raven');

const Storage = require('./Storage.js');
const Connect = require('./Connect.js');
const GithubApi = require('./GithubApi.js');
const BitbucketApi = require('./BitbucketApi.js');
const GitApi = require('./GitApi.js');
const SfdcApi = require('./SfdcApi.js');
const Metadata = require('./Metadata.js');
const utils = require('./Utils.js');

class Pipeline {
  constructor(opts) {
    this.storage = new Storage({
      configName: 'pipeline'
    });
  }

  savePipeline(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-save-pipeline-callback',utils.serialize(err), result);
    }
    try{
      const self = this;
      let pipeline = arg.pipeline;
      //console.log('>>>> pipeline', pipeline);
      if(pipeline.id) {
        const metadata = new Metadata();
        metadata.rmPipelineCache(pipeline.id);
        // Edit pipeline
        pipeline['started_at'] = '';
        pipeline['completed_at'] = '';
        pipeline['duration'] = '';
        //console.log('>>>> set pipeline', pipeline);
        self.setPipeline(pipeline.id, pipeline);
        return callback(null, {id : pipeline.id});
      }
      // New pipeline
      let pipelines = self.storage.getAll({ cache : false }); 
      if(!pipelines) pipelines = [];
      pipeline['id'] = uuidv4();
      pipelines.push(pipeline);
      self.storage.setAll(pipelines);
      return callback(null, {id : pipeline.id});
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Clone from pipeline id
   * @param {Object} ev 
   * @param {Object} arg - { id : 'pipeline id' } 
   */
  clonePipeline(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-clone-pipeline-callback',utils.serialize(err), result);
    }
    try{
      let pipelines = this.storage.getAll({ cache : false }); 
      let pipeline = this.storage.get(arg.id);
      if(utils.isBlank(pipeline)) {
        return callback(new Error('Pipeline not found.'));
      }
      // Change id
      const now = new Date();
      let cloneOpts = ['branch', 'commits', 'type', 'from', 'fromApiVersion', 'name', 'prs', 'to', 'toApiVersion', 'checkOnly', 'runTests', 'targetTypes'];
      if(pipeline.type != 'sfdc') {
        cloneOpts.push('path');
      }
      let newPipeline = utils.popItems(pipeline, cloneOpts);
      newPipeline['id'] = uuidv4();
      newPipeline['status'] = 'ready';
      newPipeline['created_at'] = now.toISOString();
      newPipeline['updated_at'] = now.toISOString();
      pipelines.push(newPipeline);
      this.storage.setAll(pipelines);
      return callback(null, {id : newPipeline.id});
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Remove from pipeline id
   * @param {Object} ev 
   * @param {Object} arg - { id : 'pipeline id' } 
   */
  removePipeline(ev, arg) {
    const self = this;
    const callback = function(err, result) {
      ev.sender.send('data-remove-pipeline-callback',utils.serialize(err), result);
    }
    try{
      let pipelines = self.storage.getAll({ cache : false }); 
      let pipeline = null;
      const metadata = new Metadata();
      for(let i in pipelines) {
        if(pipelines[i].id == arg.id) {
          pipeline = pipelines[i];
          metadata.rmPipelineCache(pipeline.id);
          pipelines.splice(i, 1);
          self.storage.setAll(pipelines);
          return callback(null, {id : arg.id});
        }
      }
      if(pipeline == null) {
        return callback(new Error('Pipeline not found.'), {id : arg.id});
      }
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Save pipeline info by id
   * @param {String} id 
   * @param {Object} arg 
   * @return {Boolean} 
   */
  setPipeline(id, arg) {
    try{
      let pipelines = this.storage.getAll({ cache : false }); 
      for(let i in pipelines) {
        if(id === pipelines[i].id) {
          for(let key in arg) {
            pipelines[i][key] = arg[key];
          }
          const now = new Date();
          pipelines[i].updated_at = now.toISOString();
        }
      }
      this.storage.setAll(pipelines);
      return true;
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return false;
    }
  }

  getPipelines(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-pipelines-callback',utils.serialize(err), result);
    }
    try{
      let result = this.storage.getAll({ cache : false }); 
      //console.log('>>>> getPipelines ', result);
      return callback(null, result);
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Get pipeline log file content
   * @param {Object} ev 
   * @param {Object} arg 
   */
  getPipelineLog(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-pipeline-log-callback',utils.serialize(err), result);
    }
    try{
      let pipeline = this.storage.get(arg.id);
      if(pipeline.deployResult && pipeline.deployResult.done != true) {
        // Uncompleted deploy, clean cache and reload
        this.storage.getAll({ cache : false }); 
        pipeline = this.storage.get(arg.id);
      }
      const metadata = new Metadata();
      const pPath = metadata.getPipelineFolder();
      const logPath = path.join(pPath, pipeline.id, 'pipeline.log');
      if(!fs.existsSync(logPath)) {
        return callback(null);
      }
      fs.readFile(logPath, 'utf-8', function(err, data) {
        //console.log('>>> getPipelineLog' + index, (new Date()));
        if(err) return callback(err);
        // read deployResult
        const drPath = path.join(pPath, pipeline.id, 'deployResult.json');
        let deployResult = {};
        if(fs.existsSync(drPath)) {
          deployResult = JSON.parse(fs.readFileSync(drPath));
        }
        const result = { body : data, deployResult : deployResult };
        return callback(null, result);
      });
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Export pipeline metadata zip file
   * @param {Object} ev 
   * @param {Object} arg 
   */
  exportMetadata(ev, arg) {
    const callback = function(err, result) {
      ev.sender.send('data-pipeline-export-metadata-callback',utils.serialize(err), result);
    }
    try{
      const metadata = new Metadata();
      const pPath = metadata.getPipelineFolder();
      const packagePath = path.join(pPath, arg.id, 'package.zip');
      if(!fs.existsSync(packagePath)) {
        return callback(null);
      }
      fs.readFile(packagePath, 'base64', function(err, data) {
        //new Buffer(data).toString('base64')
        //console.log('>>> getPipelineLog' + index, (new Date()));
        if(err) return callback(err);
        const result = { data : data };
        return callback(null, result);
      });
    }catch(err) {
      console.error('[ERROR]', err);
      Raven.captureException(err);
      return callback(err);
    }
  }

  /**
   * Start to run pipeline with id
   * @param {Object} ev 
   * @param {Object} arg 
   */
  runPipeline(ev, arg) {
    const self = this;
    const callback = function(err, result) {
      ev.sender.send('pipeline-run-callback',utils.serialize(err), result);
    }
    const processing = function() {
      ev.sender.send('pipeline-run-callback',null, { type : 'process' });
    }
    const startTime = (new Date()).toISOString();
    try{
      let pipeline = self.storage.get(arg.id);
      if(utils.isBlank(pipeline)) {
        return callback(new Error('Pipeline not found.'));
      }
      
      self.setPipeline(pipeline.id, {
        status : 'processing',
        started_at : startTime,
        completed_at : '',
        duration : ''
      });
      processing();
      
      // Mkdir pipeline cache folder
      //console.log('>>> pipeline', pipeline);
      const metadata = new Metadata();
      const pPath = metadata.mkdirPipelineFolder(pipeline.id);

      const logPath = path.join(pPath, 'pipeline.log');
      const deployResultPath = path.join(pPath, 'deployResult.json');
      const pipelineLog = function(line) {
        line = moment().format('HH:mm:ss') + ' ' + line + '\n';
        fs.appendFileSync(logPath, line);
      }
      
      // Download metadata
      //console.log('>>>> Download metadata ', pPath);
      const connect = new Connect();
      const fromConn = connect.getConnect(pipeline.from);
      const toConn = connect.getConnect(pipeline.to);
      let client;
      if(fromConn.type == 'github') {
        client = new GithubApi(fromConn);
      } else if(fromConn.type == 'bitbucket') {
        client = new BitbucketApi(fromConn);
      } else if(fromConn.type == 'sfdc') {
        client = new SfdcApi(fromConn);
      } else if(fromConn.type == 'git') {
        client = new GitApi(fromConn);
      }
      // TODO sfdc api check token not exist
      client.checkToken(fromConn)
      .then(function(token) {
        if(token != true && (token.refresh_token || token.accessToken)) {
          // Refresh Token for bitbucket
          connect.restoreToken(fromConn, token);
        }
        if(pipeline.action == 'destruct') {
          // Destruct metadata
          return Promise.resolve(true);
        }
        return metadata.checkConnect(toConn);
      })
      .then(function(success) {
        pipelineLog('[SF.api] Authorize : ' + success);
        return client.getFiles(pipeline, fromConn, pipelineLog);
        //return Promise.resolve(true);
      })
      .then(function(success) {
        // Generate package.xml file
        return metadata.createPackageXml(pPath, { version : pipeline.toApiVersion });
      })
      .then(function() {
        if(pipeline.action == 'destruct') {
          // Generate destructiveChanges.xml, package.xml files
          return metadata.createDestructiveChanges(pPath, { version : pipeline.toApiVersion });
        }
        return Promise.resolve(true);
      })
      .then(function() {
        pipelineLog('[Metadata] Generate package.xml Done.');
        // Zip Metadata 
        return metadata.archive(pPath);
      })
      .then(function(zipPath) {
        // opts @see https://jsforce.github.io/jsforce/doc/Metadata.html#deploy
        let opts = { rollbackOnError : true };
        if(pipeline.action == 'destruct') {
          // Do Destruct
          opts['purgeOnDelete'] = true;
          return metadata.deploy(fromConn, zipPath, opts, function(deployResult) {
            deployResult = self.saveDeployResult(deployResultPath, fromConn, deployResult);
            self.outputDeployProcessLog(pipelineLog, deployResult);
          });
        } else {
          // Do Deploy
          opts['runAllTests'] = (pipeline.runTests === true);
          opts['checkOnly'] = (pipeline.checkOnly === true);
          return metadata.deploy(toConn, zipPath, opts, function(deployResult) {
            deployResult = self.saveDeployResult(deployResultPath, toConn, deployResult);
            self.outputDeployProcessLog(pipelineLog, deployResult);
          });
        }
      })
      .then(function(deployResult) {
        // Save deploy result
        const targetConn = (pipeline.action == 'destruct') ? fromConn : toConn;
        deployResult = self.saveDeployResult(deployResultPath, targetConn, deployResult);
        self.outputDeployLog(pipelineLog, deployResult);
        const now = new Date();
        const endTime = now.toISOString();
        const duration = utils.getDuration(endTime, startTime);
        self.setPipeline(pipeline.id, {
          status : (deployResult.success) ? 'successful' : 'failed',
          completed_at : endTime,
          duration : duration
        });
        return callback(null, deployResult);
      })
      .catch(function(err) {
        console.error('[ERROR] Run pipeline', err);
        const now = new Date();
        const endTime = now.toISOString();
        const duration = utils.getDuration(endTime, startTime);
        self.setPipeline(pipeline.id, {
          status : 'failed',
          completed_at : endTime,
          duration : duration
        });
        pipelineLog('[ERROR] Run pipeline : ' + err);
        return callback(err);
      });

    }catch(err) {
      console.error('[ERROR] Run pipeline', err);
      Raven.captureException(err);
      const now = new Date();
      const endTime = now.toISOString();
      const duration = utils.getDuration(endTime, startTime);
      self.setPipeline(arg.id, {
        status : 'failed',
        completed_at : endTime,
        duration : duration
      });
      pipelineLog('[ERROR] Run pipeline' + err);
      return callback(err);
    }

  }

  /**
   * Output metadata deploy process log
   * @param {Function} pipelineLog 
   * @param {Object} deployResult 
   */
  outputDeployProcessLog(pipelineLog, deployResult) {
    if(!deployResult.details) {
      pipelineLog('[Metadata] Deploy submitted : ' + deployResult.id);
    } else {
      pipelineLog('[Metadata] Request Status: ' + deployResult.status);
      if(deployResult.details.componentSuccesses) {
        pipelineLog('           Components Deployed: ' + deployResult.details.componentSuccesses.length);
      }
    }
  }

  /**
   * Output metadata deploy result log
   * @param {Function} pipelineLog 
   * @param {Object} deployResult 
   */
  outputDeployLog(pipelineLog, deployResult) {
    pipelineLog('[Metadata] Deploy done');
    pipelineLog('[Metadata] Deploy result: @see ' + deployResult.url);
  }

  /**
   * Set component type label to deploy result and export to json file
   */
  saveDeployResult(filePath, targetConn, deployResult) {
    // Set Entity Label to deployResult
    const sfdcApi = new SfdcApi(targetConn);
    const componentLables = sfdcApi.getComponentLabels(targetConn.language);
    deployResult['instanceUrl'] = targetConn.instanceUrl;
    deployResult['url'] = targetConn.instanceUrl + '/changemgmt/monitorDeploymentsDetails.apexp?asyncId=' + deployResult.id

    const getStatus = function(cmp) {
      let status = 'No Change';
      if(cmp.changed == 'true') status = 'Updated';
      if(cmp.created == 'true') status = 'Created';
      if(cmp.deleted == 'true') status = 'Deleted';
      if(cmp.problem && cmp.problemType) {
        status = 'Error: ' + cmp.problem + ' (line ' + (cmp.lineNumber || 0) + ', column ' + (cmp.columnNumber || 0) + ')';
      }
      return status;
    }

    if(deployResult.details && deployResult.details.componentSuccesses) {
      for(let i = 0; i < deployResult.details.componentSuccesses.length; i++) {
        let componentType = deployResult.details.componentSuccesses[i].componentType;
        if(utils.isBlank(componentType)) continue;
        if(!componentLables.hasOwnProperty(componentType)) continue;
        deployResult.details.componentSuccesses[i]['componentTypeLabel'] = componentLables[componentType];
        deployResult.details.componentSuccesses[i]['status'] = getStatus(deployResult.details.componentSuccesses[i]);
      }
    }
    if(deployResult.details && deployResult.details.componentFailures) {
      for(let i = 0; i < deployResult.details.componentFailures.length; i++) {
        let componentType = deployResult.details.componentFailures[i].componentType;
        if(utils.isBlank(componentType)) continue;
        if(!componentLables.hasOwnProperty(componentType)) continue;
        deployResult.details.componentFailures[i]['componentTypeLabel'] = componentLables[componentType];
        deployResult.details.componentSuccesses[i]['status'] = getStatus(deployResult.details.componentSuccesses[i]);
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(deployResult));
    return deployResult;
  }

}

module.exports = Pipeline;