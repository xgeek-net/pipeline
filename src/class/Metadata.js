const electron = require('electron');
const fs = require('fs');
const path = require('path');
const makeDir = require('make-dir');
const rimraf = require('rimraf');
const archiver = require('archiver');
const sgp = require('sfdc-generate-package');

const SfdcApi = require('./SfdcApi.js');
const Connect = require('./Connect.js');

class Metadata {
  constructor(opts) {
    
  }

  getPipelineFolder() {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    const pipelinePath = path.join(userDataPath, 'pipeline');
    return pipelinePath;
  }
  /**
   * Mkdir pipeline cache folder : /pipeline/{pid}/metadata
   * @param {String} pid - pipeline id
   * @returns {String} - pipeline folder : /pipeline/{pid}
   */
  mkdirPipelineFolder(pid) {
    const pipelinePath = this.getPipelineFolder();
    if(!fs.existsSync(pipelinePath)) {
      fs.mkdirSync(pipelinePath, '0777');
    }
    const pPath = path.join(pipelinePath, pid);
    if(fs.existsSync(pPath)) {
      // Delete when exists
      rimraf(pPath, function(){
        fs.mkdirSync(pPath, '0777');
        fs.mkdirSync(path.join(pPath, 'metadata'), '0777');
      });
    } else {
      fs.mkdirSync(pPath, '0777');
      fs.mkdirSync(path.join(pPath, 'metadata'), '0777');
    }
    return pPath;
  }

  /**
   * Remove pipeline cache folder
   * @param {String} pid - pipeline id 
   * @param {Function} callback
   */
  rmPipelineCache(pid, callback) {
    const pPath = this.getPipelineFolder();
    const pipelinePath = path.join(pPath, pid);
    if(fs.existsSync(pipelinePath)) {
      rimraf(pipelinePath, callback);
    } else {
      return callback(null, true);
    }
  }

  /**
   * Save single file content to local pipeline folder
   * @param {String} pid 
   * @param {String} filename - file name include path, eg, config/default.js
   * @param {String} content - file content
   */
  saveSingleFile(pid, filename, content) {
    const self = this;
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    const pipelinePath = path.join(userDataPath, 'pipeline', pid, 'metadata');

    return new Promise(function(resolve, reject) {
      var filePath = path.join(pipelinePath, filename);
      // var dirStrWithouFileName = dirStr.substring(0, dirStr.lastIndexOf("\\"));
      var filePathWithoutName = path.dirname(filePath);

      makeDir(filePathWithoutName)
      .then(function(path) {
        fs.writeFile(filePath, content, { mode : '0777' }, function(err) {
          if(err) return reject(err);
          return resolve(true);
        });
      })
      .catch(function(err) {
        return reject(err);
      });
    
    });
  }

  /**
   * Generate package.xml for deploy
   * @param {String} metaPath - pipeline cache path
   */
  createPackageXml(targetPath, opts) {
    opts = opts || {};
    const metaPath = path.join(targetPath, 'metadata', 'src');
    if(fs.existsSync(metaPath + '/package.xml')) {
      return true;
    }
    return sgp({
      'src': metaPath, // salesforce src directory path : ./src
      'apiVersion': opts.version || '40.0', // salesforce API verion : 40.0
      'output': metaPath // package output directory path : ./src
    });
  }

  /**
   * Archive metadata package zip 
   * @param {String} targetPath (zip file root path('output/' )
   * @param {String} opts { filename : 'MyPackage.zip' }
   * @return {Promise}
   */
  archive(targetPath, opts) {
    opts = opts || {};
    const filename = opts.filename || 'package.zip';
    const metaPath = path.join(targetPath, 'metadata');
    const zipFilePath = path.join(targetPath, filename);
    return new Promise(function(resolve, reject) {
      var cwdPath = process.cwd();
      process.chdir(metaPath);
      var output = fs.createWriteStream(zipFilePath);
      var archive = archiver('zip');

      output.on('close', function () {
        process.chdir(cwdPath);
        return resolve(zipFilePath);
      });

      archive.on('error', function(err){
        process.chdir(cwdPath);
        return reject(new Error('archive metadata zip error'));
      });

      archive.pipe(output);
      archive.directory(metaPath, false);
      archive.finalize();
    });
  }

  /**
   * Check SFDC OAuth Connection
   * @param {Object} connection 
   * @param {Promise}
   */
  checkConnect(connection) {
    return new Promise(function(resolve, reject) {
      const sfdcApi = new SfdcApi(connection);
      //console.log('>>>> sfdcApi.checkToken ', connection);
      sfdcApi.checkToken()
      .then(function(result) {
        //console.log('>>>> sfdcApi.checkToken result ', result);
        if(result != true && result.accessToken) {
          const connect = new Connect();
          connect.setConnect(connection.id, result);
        }
        return resolve(true);
      })
      .catch(function(err){
        return reject(err);
      })
    });
  }

  /**
   * Deploys zipStream to project's sfdcClient
   * @param {Object} connection - sfdc connection object
   * @param {String} zipFilePath - zipped package file path
   * @param {Object} opts - { runTests: [ 'MyApexTriggerTest' ] }
   * @param {Function} processing - processing report
   * @return {Promise} 
   */
  deploy(connection, zipFilePath, opts, processing) {
    opts = opts || {};
    return new Promise(function(resolve, reject) {
      //console.log('>>> connection ', connection, zipFilePath);
      const sfdcApi = new SfdcApi(connection);
      let zipStream = fs.createReadStream(zipFilePath);
      sfdcApi.deployMetadata(zipStream, opts, 
        // Processing
        function(err, result) {
          if (err) { return reject(err); }
          processing(result);
        },
        // Complete
        function(err, result) {
          if (err) { return reject(err); }
          return resolve(result);
        });
    });
  }

}
// expose the class
module.exports = Metadata;