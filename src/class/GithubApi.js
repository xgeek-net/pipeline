const GITHUB_END_POINT = 'https://github.com/login/oauth';
const GITHUB_CALLBACK_URL = 'http://localhost/oauth/callback?type=github';
const GITHUB_CLIENT_ID = 'b57bd2d5bacc2883d339';
const GITHUB_CLIENT_SECRET = '5597f114d554106705bfe8c001958b1b2ea2fb72';
const GITHUB_STATE = 'salesforcedeliverytool';

const GitHub = require('github-api');
const request = require('request');


class GithubApi {
  constructor(opts) {
    opts = opts || {};
    this.api = null;
    if(opts.access_token) {
      this.api = new GitHub({token : opts.access_token});
    }
  }

  getAuthUrl() {
    const url = GITHUB_END_POINT + '/authorize'
        + '?client_id=' + GITHUB_CLIENT_ID
        + '&scope=user%20repo'
        + '&redirect_uri=' + encodeURIComponent(GITHUB_CALLBACK_URL)
        + '&state=' + GITHUB_STATE;
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
    const tokenUrl = GITHUB_END_POINT + '/access_token'
      + '?client_id=' + GITHUB_CLIENT_ID
      + '&client_secret=' + GITHUB_CLIENT_SECRET
      + '&code=' + code
      + '&state=' + GITHUB_STATE;
    request.get({url:tokenUrl, json: true}, function (err, body, token) {
      //console.log('>>>> request result ', err, token);
      if(err) return callback(err);

      resp = token;
      self.api = new GitHub({token : token.access_token});
      const me = self.api.getUser();
      // Request profile
      me.getProfile(function(err, profile){
        if(err) return callback(err);

        resp['avatar'] = profile.avatar_url;
        resp['username'] = profile.name;
        // List repository
        me.listRepos({type : 'all'}, function(err, repos){
          if(err) return callback(err);
          resp['repos'] = [];
          for(let rep of repos) {
            resp.repos.push({
              id : rep.id,
              name : rep.name,
              full_name : rep.full_name,
              private : rep.private
            });
          }
          console.log('>>>> request listRepos ', err, resp);
          callback(err, resp);
        })

      });
    })
  }

}

module.exports = GithubApi;