const jsforce = require('jsforce');
const CLIENT = require('../config/client');

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
        //console.log('>>> identity ', err, res);
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

  deployMetadata(zipStream, opts, callback) {
    return this.conn.metadata.deploy(zipStream, opts).complete(callback);
  }

}

module.exports = SfdcApi;