const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const moment = require('moment');
const Raven = require('raven');

const Storage = require('./Storage.js');
const Connect = require('./Connect.js');
const GithubApi = require('./GithubApi.js');
const BitbucketApi = require('./BitbucketApi.js');
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
        metadata.rmPipelineCache(pipeline.id, function() {
          // Edit pipeline
          pipeline['started_at'] = '';
          pipeline['completed_at'] = '';
          pipeline['duration'] = '';
          //console.log('>>>> set pipeline', pipeline);
          self.setPipeline(pipeline.id, pipeline);
          return callback(null, {id : pipeline.id});
        });
        return;
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
      let newPipeline = utils.popItems(pipeline, ['branch', 'commits', 'type', 'from', 'name', 'prs', 'to', '']);
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
          metadata.rmPipelineCache(pipeline.id, function() {
            pipelines.splice(i, 1);
            self.storage.setAll(pipelines);
            return callback(null, {id : arg.id});
          });
          break;
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
      let index = 1;
      
      const metadata = new Metadata();
      const pPath = metadata.getPipelineFolder();
      const logPath = path.join(pPath, arg.id, 'pipeline.log');
      if(!fs.existsSync(logPath)) {
        return callback(null);
      }
      fs.readFile(logPath, 'utf-8', function(err, data) {
        //console.log('>>> getPipelineLog' + index, (new Date()));
        index++;
        if(err) return callback(err);
        const result = data;
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
      }
      // TODO sfdc api check token not exist
      client.checkToken(fromConn)
      .then(function(token) {
        if(token != true && (token.refresh_token || token.accessToken)) {
          // Refresh Token for bitbucket
          connect.restoreToken(fromConn, token);
        }
        return metadata.checkConnect(toConn);
      })
      .then(function(success) {
        pipelineLog('[SF.api] Authorize : ' + success);
        return client.getFiles(pipeline, fromConn, pipelineLog);
      })
      .then(function(success) {
        // Generate package.xml file
        return metadata.createPackageXml(pPath, { version : pipeline.toApiVersion });
      })
      .then(function() {
        pipelineLog('[Metadata] Generate package.xml Done.');
        // Zip Metadata 
        return metadata.archive(pPath);
      })
      .then(function(zipPath) {
        // Do Deploy
        return metadata.deploy(toConn, zipPath, {}, function(deployResult) {
          self.outputDeployProcessLog(pipelineLog, deployResult);
        });
      })
      .then(function(deployResult) {
        // Save deploy result
        deployResult['url'] = toConn.instanceUrl + '/changemgmt/monitorDeploymentsDetails.apexp?asyncId=' + deployResult.id
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
    pipelineLog('[Metadata] Deploy Done : ');
    //pipelineLog('           Id: ' + deployResult.id);
    pipelineLog('           Success: ' + deployResult.success);
    pipelineLog('           Components Total: ' + deployResult.numberComponentsTotal);
    pipelineLog('           Components Error: ' + deployResult.numberComponentErrors);
    pipelineLog('           Components Deployed: ' + deployResult.numberComponentsDeployed);
    pipelineLog('           Tests Total: ' + deployResult.numberTestsTotal);
    pipelineLog('           Tests Error: ' + deployResult.numberTestErrors);
    pipelineLog('           Tests Completed: ' + deployResult.numberTestsCompleted);
    pipelineLog('[Metadata] Deploy result: @see ' + deployResult.url);
  }

}

module.exports = Pipeline;