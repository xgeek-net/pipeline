const client = {
  /** Crypto secret key */
  SECRET_KEY : process.env.SECRET_KEY,
  /** Sentry api client */
  RAVEN_CLIENT_ID : process.env.RAVEN_CLIENT_ID,
  RAVEN_RELEASE_KEY : process.env.RAVEN_RELEASE_KEY,
  /** Github api client */
  GITHUB_END_POINT : 'https://github.com/login/oauth',
  GITHUB_CALLBACK_URL : 'http://localhost/oauth/callback?type=github',
  GITHUB_CLIENT_ID : process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET,
  GITHUB_STATE : 'pipeline',
  /** Bitbucket api client */
  BITBUCKET_API : 'https://api.bitbucket.org/2.0',
  BITBUCKET_END_POINT : 'https://bitbucket.org/site/oauth2',
  BITBUCKET_CALLBACK_URL : 'http://localhost/oauth/callback?type=bitbucket',
  BITBUCKET_CLIENT_ID : process.env.BITBUCKET_CLIENT_ID,
  BITBUCKET_CLIENT_SECRET : process.env.BITBUCKET_CLIENT_SECRET,
  /** Salesforce api client */
  SFDC_CALLBACK_URL : 'http://localhost/oauth/callback?type=sfdc',
  SFDC_CLIENT_ID : process.env.SFDC_CLIENT_ID,
  SFDC_CLIENT_SECRET : process.env.SFDC_CLIENT_SECRET
}

module.exports = client;