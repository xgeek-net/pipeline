const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const xmlbuilder = require('xmlbuilder');
const archiver = require('archiver');
const sgp = require('sfdc-generate-package');

const SfdcApi = require('./SfdcApi.js');
const Connect = require('./Connect.js');
const utils = require('./Utils');

const PACKAGE_XML_FILE_NAME = 'package.xml';
const DESTRUCTIVE_XML_FILE_NAME = 'destructiveChanges.xml';

class Metadata {
  constructor(opts) {
    
  }

  getPipelineFolder() {
    const userDataPath = utils.getUserDataPath();
    const pipelinePath = path.join(userDataPath, 'pipeline');
    return pipelinePath;
  }

  /**
   * Get metadata path
   * @param {String} pid 
   */
  getMetadataFolder(pid) {
    const pipelinePath = this.getPipelineFolder();
    let pPath = path.join(pipelinePath, pid);
    return path.join(pPath, 'metadata');
  }
  /**
   * Mkdir pipeline cache folder : /pipeline/{pid}/metadata
   * @param {String} pid - pipeline id
   * @returns {String} - pipeline folder : /pipeline/{pid}
   */
  mkdirPipelineFolder(pid) {
    const pipelinePath = this.getPipelineFolder();
    if(!fse.pathExistsSync(pipelinePath)) {
      fse.ensureDirSync(pipelinePath, '0777');
    }
    const pPath = path.join(pipelinePath, pid);
    if(fse.pathExistsSync(pPath)) {
      // Delete when exists
      fse.removeSync(pPath);
    }
    fse.ensureDirSync(pPath, '0777');
    fse.ensureDirSync(path.join(pPath, 'metadata'), '0777');
    return pPath;
  }

  /**
   * Remove pipeline cache folder
   * @param {String} pid - pipeline id 
   */
  rmPipelineCache(pid) {
    const pPath = this.getPipelineFolder();
    const pipelinePath = path.join(pPath, pid);
    if(fse.pathExistsSync(pipelinePath)) {
      fse.removeSync(pipelinePath);
    }
  }

  // prepare folder for file 
  makeDir(pid, filename) {
    const self = this;
    const userDataPath = utils.getUserDataPath();
    const pipelinePath = path.join(userDataPath, 'pipeline', pid, 'metadata');
    const filePath = path.join(pipelinePath, filename);
    const filePathWithoutName = path.dirname(filePath);
    fse.ensureDirSync(filePathWithoutName, '0777');
    return filePath
  }

  // Save file from stream
  saveFileStream(filePath, response, callback) {
    const self = this;
    const localFilePath = filePath;
    // console.log('>>>saveFileStream start', localFilePath) // 200
    // console.log('>>>response', response.statusCode, localFilePath) // 200
    // console.log('>>>response', response.headers['content-type']) // 'image/png'
    const stream = fs.createWriteStream(localFilePath);
    response.pipe(stream);
    response.on('end', function() {
      stream.end();
      return callback(true);
    });
  }

  /**
   * Generate package.xml for deploy
   * @param {String} metaPath - pipeline cache path
   */
  createPackageXml(targetPath, opts) {
    opts = opts || {};
    const metaPath = path.join(targetPath, 'metadata', 'src');
    if(fse.pathExistsSync(metaPath + '/package.xml')) {
      return true;
    }
    return sgp({
      'src': metaPath, // salesforce src directory path : ./src
      'apiVersion': opts.version || '40.0', // salesforce API verion : 40.0
      'output': metaPath // package output directory path : ./src
    });
  }

  /**
   * Generate package.xml and destructiveChanges.xml for Destruct
   * @param {String} metaPath - pipeline cache path
   */
  createDestructiveChanges(targetPath, opts) {
    opts = opts || {};
    const metaPath = path.join(targetPath, 'metadata', 'src');
    
    return new Promise(function(resolve, reject) {
      // Rename to destructiveChanges.xml
      fs.renameSync(metaPath + '/' + PACKAGE_XML_FILE_NAME, metaPath + '/' + DESTRUCTIVE_XML_FILE_NAME);
      // Generate blank package.xml
      const xml = xmlbuilder.create('Package')
      .att('xmlns', 'http://soap.sforce.com/2006/04/metadata')
      .dec('1.0', 'UTF-8')
      .ele('version')
        .t(opts.version || '40.0');
      const xmlContent = xml.end({ pretty: true, indent: '  ', newline: '\n' });
      fs.writeFileSync(metaPath + '/' + PACKAGE_XML_FILE_NAME, xmlContent);

      // Remove metadata files
      fs.readdirSync(metaPath).filter(function (file) {
        if(fs.statSync(metaPath+'/'+file).isDirectory()) {
          fse.ensureDirSync(metaPath+'/'+file, '0777');
        }
        return resolve();
      });
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
      });
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