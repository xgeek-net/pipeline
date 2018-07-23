const jsforce = require('jsforce');
const async = require('async');

const utils = require('./Utils');
const CONFIG = require('../config/config');
const CLIENT = require('../config/client');
const METACONF = require('../config/metadata');

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

  checkConnect() {
    const self = this;
    return new Promise(function(resolve, reject) {
      if(!self.conn) return reject(new Error('SFDC Connect ERROR!'));
      self.conn.identity(function(err, res) {
        console.log('>>> identity ', err, res);
        if (err) {
          if(err.errorCode.indexOf('INVALID_SESSION_ID') >= 0 ||
            err.errorCode.indexOf('INVALID_LOGIN') >= 0 || 
            err.errorCode.indexOf('INVALID_OPERATION_WITH_EXPIRED_PASSWORD') >= 0 || 
            err.name.indexOf('invalid_grant') >= 0
          ) {
            //console.log('Refresh Token', self.conn.refreshToken);
            self.conn.oauth2.refreshToken(self.conn.refreshToken, function(err, ret) {
              if (err) return reject(new Error('SFDC Connect ERROR!'));
              //console.log('Refresh Token res', res);
              return resolve({ accessToken :  ret.access_token});
            });
          }
        } else {
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
          userId : userInfo.id
        };
        //console.log('>>>> data ', data);
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
            folders.push(meta);
          }
          return completion(null);
        })
        .catch(function(err) {
          return completion(err);
        });
      }, function(err){
        if(err) return reject(err);
        return resolve(folders);
      }); // .async.eachSeries
    });
  }

  getMetadataDetailList(metadataList, folders) {
    const self = this;
    //const excepts = ['LightningComponentBundle'];
    return new Promise(function(resolve, reject) {
      let metaTargets = [];
      for(let key in METACONF) {
        metaTargets.push(METACONF[key].xmlName);
      }
      console.log('>>>> metaTargets', metaTargets);

      let queues = [];
      for(let meta of metadataList) {
        if(meta.inFolder != true) {
          let metaType = meta.xmlName;
          if(metaTargets.indexOf(metaType) < 0) continue;
          if(metaType == 'CustomLabels') metaType = 'CustomLabel';
          queues.push({type: metaType, folder:null});
          continue;
        }
        let xmlName = (meta.xmlName == 'EmailTemplate') ? 'EmailFolder' : meta.xmlName + 'Folder';
        for(let fd of folders) {
          if(fd.type !== xmlName) continue;
          queues.push({type: meta.xmlName, folder: fd.fullName});
        }
      }
      let metadataDetailMap = {};
      // console.log('>>>> queues', queues);
      async.eachLimit(queues, 5, function(queue, completion) {
        console.log('>>>> queue', queue);
        self.getMetadataList(queue)
        .then(function(metadata) {
          console.log('>>>> queue : ' + queue.type, metadata.length);
          metadataDetailMap[queue.type] = metadata;
          if(queue.type == 'CustomObject' || queue.type == 'Workflow') {
            //TODO SharingRules
            return self.readChildMetadata(metadata);
          } else {
            return true;
          }
        })
        .then(function(metadataMap) {
          if(metadataMap == true) {
            return completion(null);
          }
          console.log('>>>> metadataMap ', Object.keys(metadataMap));
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

  readChildMetadata(metadata) {
    const self = this;
    return new Promise(function(resolve, reject) {
      if(metadata.length == 0) {
        // metadata is empty
        return resolve(true);
      }
      let metadataMap = {}; 
      let fullNames = [];
      let metaType;
      for(let meta of metadata) {
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
                if(meta.fullName) cMeta['Object'] = meta.fullName;
                if(meta.label) cMeta['ObjectLabel'] = meta.label;
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
}

module.exports = SfdcApi;