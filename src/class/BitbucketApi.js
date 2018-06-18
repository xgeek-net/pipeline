//https://bitbucket.org/account/user/dawn8898/api
const BITBUCKET_API = 'https://api.bitbucket.org/2.0';
const BITBUCKET_END_POINT = 'https://bitbucket.org/site/oauth2';
const BITBUCKET_CALLBACK_URL = 'http://localhost/oauth/callback?type=bitbucket';
const BITBUCKET_CLIENT_ID = 'yd4yEH74WD8Px4xyve';
const BITBUCKET_CLIENT_SECRET = '5q55cA2TS7PbZbEDZ4tWEjRu37bAeLXV';
const BITBUCKET_STATE = 'salesforcedeliverytool';

//const { createBitbucketAPI } = require('bitbucket-api-v2/dist/bitbucketAPI');
const request = require('request');


class BitbucketApi {
  constructor(opts) {
    opts = opts || {};
    this.access_token = opts.access_token;
    if(opts.access_token) {
      //this.api = createBitbucketAPI()
      //this.api.authenticateOAuth2(opts.access_token);
    }
  }

  getAuthUrl() {
    const url = BITBUCKET_END_POINT + '/authorize'
        + '?client_id=' + BITBUCKET_CLIENT_ID
        + '&response_type=token';
    //console.log('>>>> getAuthUrl ', url);
    return url;
  }

  /**
   * Authorize access token from code
   * @param {Object} token  { access_token : '', scopes : 'pullrequest account', 
   *                          expires_in : '7200', token_type : 'bearer'}
   * @param {Function} callback 
   */
  authorize(token, callback) {
    let resp = {};
    const self = this;
    resp = token;
    self.access_token = token.access_token;
    self.apiCall('user', function(err, user) {
      if(err) return callback(err);
      resp['username'] = user.username;
      resp['avatar'] = user.links.avatar.href;
      self.apiCall('repositories/' + user.username, { sort : '-updated_on' }, function(err, response) {
        if(err) return callback(err);
        const repos = response.values;
        resp['repos'] = [];
        for(let rep of repos) {
          resp.repos.push({
            id : rep.uuid,
            name : rep.name,
            full_name : rep.full_name,
            private : rep.is_private
          });
        }
        console.log('>>>> request listRepos ', err, resp);
        callback(err, resp);
      }); // .self.apiCall('repositories/'
    }); // .self.apiCall('user'
  }

  apiCall(apiName, opts, callback) {
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    const params = {
      headers: {
        Authorization: ' Bearer ' + this.access_token
      },
      qs: opts,
      url: BITBUCKET_API + '/' + apiName,
      json: true,
    };
    request.get(params, function(err, body, res) {
      callback(err, res);
    });
  }
}

module.exports = BitbucketApi;