//https://bitbucket.org/account/user/dawn8898/api
const request = require('request');
const CLIENT = require('../config/client');

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
    const url = CLIENT.BITBUCKET_END_POINT + '/authorize'
        + '?client_id=' + CLIENT.BITBUCKET_CLIENT_ID
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
      url: CLIENT.BITBUCKET_API + '/' + apiName,
      json: true,
    };
    request.get(params, function(err, body, res) {
      callback(err, res);
    });
  }
}

module.exports = BitbucketApi;