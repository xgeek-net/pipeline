const fs = require('fs');
const fse = require('fs-extra');
const jsforce = require('jsforce');
const async = require('async');
const path = require('path');
//const extract = require('extract-zip');
const DecompressZip = require('decompress-zip');

const utils = require('./Utils');
//const Metadata = require('./Metadata');
const CONFIG = require('../config/config');
const CLIENT = require('../config/client');
const METACONF = require('../config/package');

class SfdcApi {
  constructor(opts) {
    opts = opts || {};
    this.orgType = 'sandbox';
    this.conn = null;
    if(opts.accessToken && opts.instanceUrl && opts.orgType) {
      this.orgType = opts.orgType;
      const oauth2 = this.getOAuthClient(opts.orgType);
      this.conn = new jsforce.Connection({
        oauth2 : oauth2,
        instanceUrl : opts.instanceUrl,
        accessToken : opts.accessToken,
        refreshToken : opts.refreshToken
      });
    }
    this.apiVer = CONFIG.SFDC_MAX_API_VERSION;
    if(opts.fromApiVersion) {
      this.apiVer = opts.fromApiVersion;
    }
  }

  getAuthUrl(orgType) {
    this.orgType = orgType;
    var oauth2 = this.getOAuthClient(orgType);
    var url = oauth2.getAuthorizationUrl({ scope : 'api id refresh_token' });
    return url;
  }

  checkToken() {
    const self = this;
    return new Promise(function(resolve, reject) {
      if(!self.conn) return reject(new Error('SFDC Connect ERROR!'));
      self.conn.identity(function(err, res) {
        // console.log('>>> identity ', err, res);
        if (err) {
          const errorCode = err.errorCode || '';
          const errorName = err.name || '';
          if(errorCode.indexOf('INVALID_SESSION_ID') >= 0 ||
            errorCode.indexOf('INVALID_LOGIN') >= 0 || 
            errorCode.indexOf('INVALID_OPERATION_WITH_EXPIRED_PASSWORD') >= 0 || 
            errorName.indexOf('invalid_grant') >= 0
          ) {
            //console.log('Refresh Token', self.conn.refreshToken);
            self.conn.oauth2.refreshToken(self.conn.refreshToken, function(err, ret) {
              if (err) return reject(new Error('SFDC Connect ERROR!'));
              //console.log('Refresh Token res', res);
              return resolve({ accessToken :  ret.access_token});
            });
          }
        } else {
          // Set Default value
          self.conn.metadata.pollTimeout = 300000; // 5 mins

          return resolve(true);
        }
      });
    });
    
  }

  /**
   * Authorize access token from code
   * @param {String} code 
   * @param {Function} callback 
   */
  authorize(code, callback) {
    let resp = {};
    const self = this;
    var oauth2 = self.getOAuthClient(self.orgType);
    self.conn = new jsforce.Connection({ oauth2 : oauth2 });
    self.conn.authorize(code, function(err, userInfo) {
      if (err) { 
        return callback(err); 
      }
      self.conn.sobject('User').retrieve(userInfo.id, function(err, user) {
        if (err) {
          return callback(err);
        }
        //console.log('>>>> user ', user);
        //console.log('>>>> userInfo ', userInfo);
        resp = {
          loginUrl : self.conn.loginUrl,
          accessToken : self.conn.accessToken,
          refreshToken : self.conn.refreshToken,
          instanceUrl : self.conn.instanceUrl,
          username : user.Username,
          fullname : user.Name,
          avatar : self.conn.instanceUrl + '/_slds/images/themes/lightning_blue/lightning_blue_profile_avatar_96.png',
          orgId : userInfo.organizationId,
          orgType : self.orgType,
          language : user.LanguageLocaleKey,  //en_US, ja
          userId : userInfo.id
        };
        //console.log('>>>> resp ', resp);
        return callback(null, resp);
      });
    });
  }

  getOAuthClient(orgType) {
    var loginUrl = (orgType == 'production') ? 'https://login.salesforce.com' : 'https://test.salesforce.com';
    var oauth2 = new jsforce.OAuth2({
      loginUrl : loginUrl,
      clientId : CLIENT.SFDC_CLIENT_ID,
      clientSecret : CLIENT.SFDC_CLIENT_SECRET,
      redirectUri : CLIENT.SFDC_CALLBACK_URL + '&orgType=' + orgType
    });
    return oauth2;
  }
  /**
   * 
   * @param {Object} zipStream 
   * @param {Object} opts 
   * @param {Function} processing 
   * @param {Function} completion 
   */
  deployMetadata(zipStream, opts, processing, completion) {
    // @see https://github.com/jsforce/jsforce/issues/289  polling timeout error
    /*return this.conn.metadata.deploy(zipStream, opts).complete(completion);*/
    const self = this;
    let refIntervalId;
    self.conn.metadata.deploy(zipStream, opts, function(err, res) {
      if(err) return completion(err);
      // Block twice fired
      if(refIntervalId) return;
      // Processing
      processing(null, res);
      refIntervalId = setInterval(function() {
        self.conn.metadata.checkDeployStatus(res.id, true, function(err, deployResult){
          if(err) return completion(err);
          if(deployResult.done) {
            clearInterval(refIntervalId);
            return completion(null, deployResult);
          } else {
            processing(null, deployResult);
          }
        });
      }, 5000);
    });
  }

  describeGlobal() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.conn.describeGlobal(function(err, res) {
        if(err) { return reject(err); }
        return resolve(res.sobjects);
      });
    });
    
  }
 
  describeMetadata() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.conn.metadata.describe(self.apiVer, function(err, metadata) {
        if(err) { return reject(err); }
        if(utils.isBlank(metadata)) return reject(new Error('Metadata not found'));
        return resolve(metadata.metadataObjects);
      });
    });
  }

  getMetadataList(types) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.conn.metadata.list(types, self.apiVer, function(err, metadata) {
        if(err) { return reject(err); }
        if(utils.isBlank(metadata))return resolve([]);
        if(metadata && !Array.isArray(metadata)) metadata = [metadata];
        return resolve(metadata);
      });
    });
  }

  getFolderList(metadataList) {
    const self = this;
    return new Promise(function(resolve, reject) {
      let types = [];
      for(let meta of metadataList) {
        if(meta.inFolder != true) continue;
        let xmlName = (meta.xmlName == 'EmailTemplate') ? 'Email' : meta.xmlName;
        types.push({type: xmlName + 'Folder', folder:null});
      }
      if(types.length == 0) return resolve([]);
      let folders = [];
      async.eachLimit(types, 5, function(type, completion) {
        self.getMetadataList(type)
        .then(function(metadata) {
          for(let meta of metadata) {
            if(meta.manageableState !== 'unmanaged' && meta.manageableState !== undefined) continue;
            folders.push(meta);
          }
          return completion(null);
        })
        .catch(function(err) {
          return completion(err);
        });
      }, function(err){
        if(err) return reject(err);
        // Set Folder Name
        self.conn.query('SELECT Id, Name FROM Folder', function(err, res) {
          if(err) return reject(err);
          let labelMap = {};
          for(let i = 0; i < res.records.length; i++) {
            const record = res.records[i];
            labelMap[record.Id] = record.Name;
          }
          for(let i = 0; i < folders.length; i++) {
            if(labelMap.hasOwnProperty(folders[i].id)) {
              folders[i]['label'] = labelMap[folders[i].id];
            }
          }
          return resolve(folders);
        });
      }); // .async.eachSeries
    });
  }

  getMetadataDetailList(metadataList, folders, objLabelMap) {
    const self = this;
    //const excepts = ['LightningComponentBundle'];
    return new Promise(function(resolve, reject) {
      let metaTargets = [];
      for(let key in METACONF) {
        metaTargets.push(METACONF[key].xmlName);
      }
      //console.log('>>>> metaTargets', metaTargets);
      let queues = [];
      for(let meta of metadataList) {
        if(meta.inFolder != true) {
          let metaType = meta.xmlName;
          if(metaTargets.indexOf(metaType) < 0) continue;
          if(metaType == 'CustomLabels') metaType = 'CustomLabel';
          queues.push({type: metaType});
          continue;
        }
        let xmlName = (meta.xmlName == 'EmailTemplate') ? 'EmailFolder' : meta.xmlName + 'Folder';
        for(let fd of folders) {
          if(fd.type !== xmlName) continue;
          // attribute folderLabel is used for set folder name to metadata in filterMetadata()
          queues.push({type: meta.xmlName, folder: fd.fullName, folderLabel : fd.label});
        }
      }
      let metadataDetailMap = {};
      // console.log('>>>> queues', queues);
      async.eachLimit(queues, 5, function(queue, completion) {
        // Clear folder attribute if folder is null
        const param = (queue.folder) ? { type : queue.type, folder : queue.folder } : { type : queue.type };
        self.getMetadataList(param)
        .then(function(metadata) {
          return self.filterMetadata(queue, metadata, objLabelMap);
        })
        .then(function(metadata) {
          if(metadataDetailMap[queue.type] && metadataDetailMap[queue.type].length > 0) {
            // e.g. multiple dashboard folders
            metadataDetailMap[queue.type].push(...metadata);
          } else if(queue.type !== 'Workflow') {
            // Workflow needs be filtered
            metadataDetailMap[queue.type] = metadata;
          }
          // clear standard object (custom field of standard object need to be pulled)
          if(queue.type == 'CustomObject') {
            let customObjs = [];
            for(let i = 0; i < metadata.length; i++) {
              const meta = metadata[i];
              if(!meta.fullName.endsWith('__c') && !meta.fullName.endsWith('__mdt') && !meta.fullName.endsWith('__kav')) {
                continue;
              }
              customObjs.push(meta);
            }
            metadataDetailMap[queue.type] = customObjs;
          }
          
          if(queue.type == 'CustomObject' || queue.type == 'Workflow') {
            //TODO SharingRules
            return self.readChildMetadata(metadata, objLabelMap);
          } else {
            return true;
          }
        })
        .then(function(metadataMap) {
          if(metadataMap == true) {
            return completion(null);
          }
          //console.log('>>>> metadataMap ', Object.keys(metadataMap));
          for(let type in metadataMap) {
            metadataDetailMap[type] = metadataMap[type];
          }
          return completion(null);
        })
        .catch(function(err) {
          return completion(err);
        });
      }, function(err){
        if(err) return reject(err);
        return resolve(metadataDetailMap);
      }); // .async.eachSeries
    });
  }

  // Filter unnecessary metadata, e.g : standard application
  // Set metadata label with SOAP api query
  filterMetadata(queue, metadata, objLabelMap) {
    const self = this;
    const type = queue.type;
    return new Promise(function(resolve, reject) {
      let filterFunction = function(meta) {
        // escape standard and package metadata
        return meta.manageableState !== 'unmanaged' && meta.manageableState !== undefined;
      };
      let resetFunction;
      switch(type){
        case 'ApexClass' : 
        case 'ApexComponent' : 
        case 'ApexPage' : 
        case 'ApexTrigger' : 
        case 'CustomApplication' : 
        case 'CustomLabel' : 
        case 'CustomField' : 
        case 'CustomTab' : 
        case 'Dashboard' :
        case 'Document' : 
        case 'EmailTemplate' :  
        case 'ListView' :  
        case 'ReportType' : 
        case 'Report' :
          filterFunction = function(meta) {
            // escape standard and package metadata
            return (utils.isNotBlank(meta.namespacePrefix));
          };
          if(type == 'CustomTab') {
            resetFunction = function(meta) {
              meta['customName'] = (objLabelMap.hasOwnProperty(meta.fullName)) ? objLabelMap[meta.fullName] : meta.fullName;
              return meta;
            };
          }
          if(type == 'Dashboard' || type == 'Document' || type == 'EmailTemplate' || type == 'Report') {
            resetFunction = function(meta) {
              const names = meta.fullName.split('/');
              meta['customName'] = names[(names.length-1)];
              meta['folder'] = queue.folder;
              meta['folderLabel'] = queue.folderLabel;
              return meta;
            };
          }
          break;
        case 'ApprovalProcess' :
        case 'CustomMetadata' :
        case 'QuickAction' : 
          // Case.Reply → Reply , Case
          resetFunction = function(meta) {
            const names = meta.fullName.split('.');
            if(names.length != 2) return meta;
            const objName = (type == 'CustomMetadata') ? (names[0] + '__mdt') : names[0];
            meta['object'] = objName;
            meta['objectLabel'] = (objLabelMap.hasOwnProperty(objName)) ? objLabelMap[objName] : objName;
            meta['customName'] = names[1]; // Case.Reply → Reply
            return meta;
          };
          break;
        case 'CustomObject' : 
        case 'MatchingRules' : 
        case 'SharingRules' : 
          /*filterFunction = function(meta) {
            return (!meta.fullName.endsWith('__c') && !meta.fullName.endsWith('__mdt') && !meta.fullName.endsWith('__kav'));
          }*/
          resetFunction = function(meta) {
            meta['customName'] = (objLabelMap.hasOwnProperty(meta.fullName)) ? objLabelMap[meta.fullName] : meta.fullName;
            return meta;
          };
          break;
        case 'Layout' : 
          // e.g. OpportunityLineItem-商談商品 ページレイアウト → 商談商品 ページレイアウト
          resetFunction = function(meta) {
            const names = meta.fullName.split('-');
            if(names.length > 1) {
              const objName = names[0];
              meta['object'] = objName;
              meta['objectLabel'] = (objLabelMap.hasOwnProperty(objName)) ? objLabelMap[objName] : objName;
              names.shift();  // remove object name
              meta['customName'] = decodeURIComponent(names.join('-')); 
            } 
            return meta;
          };
          break;
        case 'Group' :
        case 'RecordType' :
        case 'Role' :
          // Needs requestMetaLabel
          break;
        default : 
          break;
      }

      let targets = [];
      for(let meta of metadata) {
        if(filterFunction && filterFunction(meta)) {
          // Filter standard object
          continue;
        }
        if(resetFunction) {
          meta = resetFunction(meta);
        }
        targets.push(meta);
      }
      self.requestMetaLabel(type, targets, resolve);
    });
  }

  // Request metadata label, e.g. : dashboard 
  requestMetaLabel(type, targets, callback) {
    const self = this;
    const labelQueryMap = {
      'Group' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM Group' },
      'Document' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM Document' },
      'Dashboard' : { 'field' : 'Title', 'query' : 'SELECT Id, Title FROM Dashboard' },
      'EmailTemplate' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM EmailTemplate' },
      'ListView' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM ListView' },
      'RecordType' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM RecordType' },
      'Report' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM Report' },
      'Role' : { 'field' : 'Name', 'query' : 'SELECT Id, Name FROM UserRole' }
    }
    if(labelQueryMap.hasOwnProperty(type)) {
      var labelQuery = labelQueryMap[type];
      self.conn.query(labelQuery.query, function(err, res) {
        if(err) return reject(err);
        let labelMap = {};
        for(let i = 0; i < res.records.length; i++) {
          const record = res.records[i];
          labelMap[record.Id] = record[labelQuery.field];
        }
        for(let i = 0; i < targets.length; i++) {
          if(labelMap.hasOwnProperty(targets[i].id)) {
            targets[i]['customName'] = labelMap[targets[i].id];
          }
        }
        return callback(targets);
      });
    } else {
      return callback(targets);
    }
  }

  readChildMetadata(metadata, objLabelMap) {
    const self = this;
    return new Promise(function(resolve, reject) {
      if(metadata.length == 0) {
        // metadata is empty
        return resolve(true);
      }
      let metadataMap = {}; 
      let fullNames = [];
      let metaType;
      if(!Array.isArray(metadata)) console.log('[ERROR]', metadata);
      for(let meta of metadata) {
        // Filter object which has not fields, 
        // to fix sf:UNKNOWN_EXCEPTION: UNKNOWN_EXCEPTION bug
        if(!objLabelMap.hasOwnProperty(meta.fullName)) continue;
        metaType = meta.type;
        fullNames.push(meta.fullName);
      }
      // sf:EXCEEDED_ID_LIMIT: record limit reached. 
      // cannot submit more than 10 records in this operation
      const exceededLimit = 10;
      if(fullNames.length > exceededLimit) {
        let pages = [];
        for(let i = 0; i < fullNames.length; i++) {
          if(i % exceededLimit == 0) {
            pages.push([]);
          }
          pages[(pages.length - 1)].push(fullNames[i]);
        }
        fullNames = pages;
      } else {
        fullNames = [fullNames];
      }
      
      let children = {};
      for(let key in METACONF) {
        if(METACONF[key].xmlName != metaType) continue;
        children = METACONF[key].children;
      }
      //console.log('>>>> fullNames ', metaType, fullNames);
      if(fullNames.length == 0) return resolve(true);
      async.eachLimit(fullNames, 5, function(queue, completion) {
        //console.log('>>>> read queue ', metaType, queue);
        self.conn.metadata.read(metaType, queue, function(err, result) {
          if(err) {
            console.log('ERROR', err, metaType, queue, result);
            return completion(err);
          }
          for(let ckey in children) {
            // Divide with type category, e.g CustomField, ActionOverride
            // { CustomField : [], ActionOverride : '' }
            let child = children[ckey];
            if(!metadataMap.hasOwnProperty(child.typeName)) {
              metadataMap[child.typeName] = [];
            }
            if(!Array.isArray(result)) result = [result];
            for(let meta of result) {
              if(!meta.hasOwnProperty(ckey)) continue;
              let childMeta = meta[ckey];
              if(!Array.isArray(childMeta)) childMeta = [childMeta];
              //console.log('>>>> childMeta', childMeta, ckey);
              for(let cMeta of childMeta) {
                if(cMeta.hasOwnProperty('type')) {
                  cMeta['fieldType'] = cMeta.type;
                }
                cMeta['type'] = child.typeName;
                cMeta['fullName'] = (child.name == 'fullName') ? cMeta.fullName : cMeta[child.name];
                if(child.typeName == 'CustomField' && !cMeta.fullName.endsWith('__c')) {
                  // Filter standard field
                  continue;
                }
                if(cMeta.label) cMeta['customName'] = cMeta.label;
                if(meta.fullName) cMeta['object'] = meta.fullName;
                if(meta.label) cMeta['objectLabel'] = meta.label;
                if(utils.isBlank(cMeta.ObjectLabel) && objLabelMap.hasOwnProperty(meta.fullName)) {
                  // Set Object Label for Workflow Alert
                  cMeta['objectLabel'] = objLabelMap[meta.fullName];
                }
                if(child.typeName == 'WorkflowAlert' && cMeta.description) cMeta['customName'] = cMeta.description;
                if(child.typeName == 'WorkflowFieldUpdate' && cMeta.name) cMeta['customName'] = cMeta.name;

                metadataMap[child.typeName].push(cMeta);
              }
            }
          }
          return completion(null);
        }); // .metadata.read

      }, function(err){
        if(err) return reject(err);
        return resolve(metadataMap);
      }); // .async.eachSeries
      
    });
  }

  // Get component labels
  getComponentLabels(language) {
    const getLabel = function(meta, typeKey) {
      let label  = meta[typeKey];
      if(language == 'ja' && meta.label_ja && meta.label_ja.length > 0) {
        label = meta.label_ja;
      } else if(meta.label && meta.label.length > 0) {
        label = meta.label;
      }
      return label;
    }
    let labels = {};
    for(let type in METACONF) {
      let meta = METACONF[type];
      labels[meta.xmlName] = getLabel(meta, 'xmlName');
      if(meta.xmlName == 'CustomLabels') {
        labels['CustomLabel'] = labels[meta.xmlName];
      }
      // Has children
      if(meta.xmlName == 'CustomObject' || meta.xmlName == 'Workflow' || meta.xmlName == 'SharingRules') {
        for(let ctype in meta.children) {
          let cMeta = meta.children[ctype];
          labels[cMeta.typeName] = getLabel(cMeta, 'typeName');
        }
      }
    }
    return labels;
  }

  /**
   * Download files for pipeline
   * @param {Object} pipeline 
   * @param {Object} connection 
   */
  getFiles(pipeline, connection, logger) {
    const self = this;
    //const metadata = new Metadata();
    self.pipeline = pipeline;
    self.logger = logger;  // Report process log to 
    self.logger('[SFDC] Retrieve from ' + connection.name + ':');
    return new Promise(function(resolve, reject) {
      // { "ApexClass" : [ "thisclass", "thatclass" ], "ApexPage" : "*" }
      const userDataPath = utils.getUserDataPath();
      const pipelinePath = path.join(userDataPath, 'pipeline', pipeline.id);
      const metaPath = path.join(pipelinePath, 'metadata', 'src');
      if(!fs.existsSync(metaPath)) {
        fs.mkdirSync(metaPath, '0777');
      }
      //const pipePath = metadata.getPipelineFolder();
      for(let type of pipeline.targetTypes) {
        self.logger('        > ' + type.name + ' [' + type.members.join(', ') + ']');
      }
      const packagePath = pipelinePath + '/src.zip';
      const zipstream = fs.createWriteStream(packagePath);
      const retrieveResult = self.conn.metadata.retrieve({
        apiVersion: pipeline.fromApiVersion,
        singlePackage: true,
        unpackaged: {
          types: pipeline.targetTypes
        }
      });
      retrieveResult.complete(function(err, result) {
        if(err) return reject(err);
        if(result.success!='true') {
          return reject(new Error('Retrieve metadata failed'));
        }
      });
      zipstream.on('error', function(err){
        return reject(err);
      });
      // Retrieve and zip done
      zipstream.on('close', function(){
        self.logger('[SFDC] Retrieve metadata Done.');
        // self.logger('[SFDC] packagePath DecompressZip .' + packagePath + ' > ' + metaPath + ' > ' + (fs.statSync(packagePath).size));
        if(!fs.existsSync(packagePath)) return reject(new Error('Metadata zip not found'));
        self.extractMetaZip(packagePath, metaPath, function(err, success) {
          if(err) return reject(err);
          return resolve(success);
        });
      });
      retrieveResult.stream().pipe(zipstream);
    });
  }

  // Extract metadata zip file to src folder
  extractMetaZip(sourceZipPath, targetPath, callback) {
    const fileinfo = fs.statSync(sourceZipPath);
    if(fileinfo.size == 0) {
      // Is written
      return callback(new Error('Metadata zip not found'));
    }
    // Ready to extract
    const unzipper = new DecompressZip(sourceZipPath)
    unzipper.on('error', function (err) {
      // console.log('[SFDC] extract err.' + err);
      if(err) return callback(err);
    });
    unzipper.on('extract', function (log) {
      // console.log('[SFDC]Finished extracting' + log);
      fse.ensureDirSync(sourceZipPath, '0777');
      return callback(null, true);
    });
    unzipper.extract({
      path: targetPath,
      filter: function (file) {
        return file.type !== "SymbolicLink";
      }
    });
  }
  
}

module.exports = SfdcApi;