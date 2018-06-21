const jsforce = require('jsforce');
const CLIENT = require('../config/client');

class SfdcApi {
  constructor(opts) {
    opts = opts || {};
    this.orgType = 'sandbox';
    this.conn = null;
    if(opts.access_token) {
      //this.api = createBitbucketAPI()
      //this.api.authenticateOAuth2(opts.access_token);
    }
  }

  getAuthUrl(orgType) {
    this.orgType = orgType;
    var oauth2 = this.getOAuthClient(orgType);
    var url = oauth2.getAuthorizationUrl({ scope : 'api id refresh_token' });
    return url;
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
}

module.exports = SfdcApi;