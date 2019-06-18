const token = {
  github : {
    "access_token": process.env.MOCHA_GITHUB_ACCESS_TOKEN,
    "avatar": "https://avatars0.githubusercontent.com/u/5466487?v=4",
    "loginname": "xgeek-net",
    "username": "Xiaoan Lin",
    "repos": {
        "full_name": "xgeek-net/pipeline-mocha-deploy",
        "id": 191014909,
        "name": "pipeline-mocha-deploy",
        "private": true
    }
  },
  sfdc : {
    "accessToken": process.env.MOCHA_SFDC_ACCESS_TOKEN,
    "refreshToken": process.env.MOCHA_SFDC_REFRESH_TOKEN,
    "avatar": "https://ap4.salesforce.com/_slds/images/themes/lightning_blue/lightning_blue_profile_avatar_96.png",
    "fullname": "Xiaoan Lin",
    "instanceUrl": "https://ap4.salesforce.com",
    "language": "ja",
    "loginUrl": "https://login.salesforce.com",
    "orgId": process.env.MOCHA_SFDC_ORGID,
    "orgType": "production",
    "userId": process.env.MOCHA_SFDC_USERID,
    "username": process.env.MOCHA_SFDC_USERNAME
  }
}

module.exports = token;