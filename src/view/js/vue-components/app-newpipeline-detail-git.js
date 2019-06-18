Vue.component('app-newpipeline-detail-git', {
  props: ['connection', 'record'],
  data : function () {
    return {
      pipeline : {
        type : null,
        name : '',
        path : '',
        prs : [],
        branch : {},
        commits : []
      },
      branchName : '',
      pullrequests : null,
      pullrequestMap : null,
      branches : null,
      branchMap : null,
      commits : null,
      commitMap : null
    }
  },
  mounted: function () {
    const self = this;
    if(self.record) {
      self.setPipeline(self.record);
    }
  },
  methods: {
    /**
     * Reload component when connection changed
     * Called from parent component
     */
    reload : function() {
      const self = this;
      self.pipeline = { type : null, name : '', path : '', prs : [], branch : '', commits : [] };
      self.pullrequests = null;
      self.pullrequestMap = null;
      self.branches = null;
      self.branchMap = null;
      self.commits = null;
      self.commitMap = null;
    },
    // Edit pipeline data
    setPipeline : function(pipeline) {
      const self = this;
      self.pipeline = pipeline;
      if(self.pipeline.type == 'pr') {
        self.listPullRequests();
      }
      if(self.pipeline.type == 'branch') {
        self.listBranches();
      }
      if(self.pipeline.type == 'commit') {
        self.listCommits();
      }
    },
    getPipeline : function(){
      // Clear dummy data
      if(this.pipeline.type == 'pr') {
        this.pipeline.branch = {};
        this.pipeline.commits = [];
      }
      if(this.pipeline.type == 'branch') {
        this.pipeline.prs = [];
        this.pipeline.commits = [];
      }
      if(this.pipeline.type == 'commit') {
        this.pipeline.prs = [];
      }
      return this.pipeline;
    },
    listPullRequests : function(ev) {
      const self = this;
      self.pipeline.type = 'pr';
      app.showLoading();
      // Request pull requests
      app.request('git-pullrequests', 
        self.connection,
        function(err, pulls) {
          app.hideLoading();
          if(err) return app.handleError(err);
          //console.log('>>> git-pullrequests callback ',err, pulls);
          self.pullrequests = pulls;
          self.pullrequestMap = {};
          let checkedPrs = [];
          if(self.pipeline.prs.length > 0) {
            for(let pr of self.pipeline.prs) {
              checkedPrs.push(pr.number);
            }
          }
          for(let pr of pulls) {
            const checked = (checkedPrs.indexOf(pr.number) >= 0) ? true : false;
            self.pullrequestMap[pr.number] = { number : pr.number, base : pr.base, sha : pr.sha, checked : checked };
          }
        }
      );
      
    },
    listBranches : function(ev, opts) {
      const self = this;
      opts = opts || {};
      self.pipeline.type = (opts.type) ? opts.type : 'branch';
      app.showLoading();
      //console.log('>>> listBranches ',self.pipeline);
      // Request branches
      app.request('git-branches', 
        self.connection,
        function(err, branches) {
          app.hideLoading();
          if(err) return app.handleError(err);
          self.branches = branches;
          self.branchMap = {};
          for(let br of branches) {
            self.branchMap[br.name] = { name : br.name, sha : br.sha };
          }
          if(self.pipeline.branch.name) {
            // Check branch select
            self.branchName = self.pipeline.branch.name;
          }
          if(opts.callback) opts.callback();
        }
      );
    },
    /**
     * Click commit type button event
     */
    listCommits : function(ev) {
      const self = this;
      self.listBranches(ev, { type : 'commit', callback : function() {
        if(self.branchName && self.branchName.length > 0) {
          // Reload commit list
          self.selectBranch();
        }
      }});
    },
    checkPR : function(prNum, ev) {
      const self = this;
      const checked = ev.target.checked;
      let index = -1;
      for(let pi in self.pipeline.prs) {
        if(self.pipeline.prs[pi].number == prNum) {
          index = pi;
        }
      }
      if(checked && index < 0) {
        const newPr = self.pullrequestMap[prNum];
        self.pipeline.prs.push(newPr);
      }
      if(!checked && index >= 0) {
        self.pipeline.prs.splice(index, 1);
      }
    },
    selectBranch : function(ev) {
      const self = this;
      self.pipeline.branch = self.branchMap[self.branchName];
      if(self.pipeline.type != 'commit') return;
      app.showLoading();
      //console.log('>>>> pipeline ', self.pipeline);
      // Request pull requests
      app.request('git-branch-commits', 
        { connection : self.connection,
         branch : self.pipeline.branch },
        function(err, commits) {
          app.hideLoading();
          if(err) return app.handleError(err);
          self.commits = commits;
          self.commitMap = {};
          let checkedCommits = [];
          if(self.pipeline.commits.length > 0) {
            for(let cm of self.pipeline.commits) {
              checkedCommits.push(cm.sha);
            }
          }
          for(let commit of commits) {
            const checked = (checkedCommits.indexOf(commit.sha) >= 0) ? true : false;
            self.commitMap[commit.sha] = { sha : commit.sha, commit_date : commit.commit_date, checked : checked };
          }
        }
      );
    },
    checkCommit : function(sha, ev) {
      const self = this;
      const checked = ev.target.checked;
      let index = -1;
      for(let ck in self.pipeline.commits) {
        if(self.pipeline.commits[ck].sha == sha) {
          index = ck;
        }
      }
      if(checked && index < 0) {
        const newCom = self.commitMap[sha];
        self.pipeline.commits.push(newCom);
      }
      if(!checked && index >= 0) {
        self.pipeline.commits.splice(index, 1);
      }
    }
  },
  template: `
    <article class="slds-card new-pipeline-detail">
      <div class="slds-card__body slds-card__body_inner slds-m-around_small">
        <div class="slds-form slds-form_horizontal">
          <div class="slds-form-element">
            <label class="slds-form-element__label" for="ipt-pipeline-name">Pipeline Name</label>
            <div class="slds-form-element__control">
              <input type="text" id="ipt-pipeline-name" v-model="pipeline.name" class="slds-input input-small" placeholder="Pipeline Name" />
            </div>
          </div><!-- .slds-form-element -->

          <div class="slds-form-element">
            <label class="slds-form-element__label" for="ipt-pipeline-path">Root Path</label>
            <div class="slds-form-element__control">
              <input type="text" id="ipt-pipeline-path" v-model="pipeline.path" class="slds-input input-small" placeholder="Metadata src folder path (option)" />
              <p class="describe slds-m-top_xxx-small">Normally, you have to assign nothing if src folder is the root directory in git repository.<br />
                e.g. set "sfdc/" when src folder is commited as path "sfdc/src".
              </p>
            </div>
          </div><!-- .slds-form-element -->

          <div class="slds-form-element">
            <label class="slds-form-element__label">Source Type</label>
            <div class="slds-form-element__control">
              <div class="slds-visual-picker slds-visual-picker_medium" v-if="connection.type!='git'">
                <input type="radio" id="visual-picker-source-type-pr" v-bind:checked="pipeline.type=='pr'" value="1" name="sourcetype" v-on:click="listPullRequests()" />
                <label for="visual-picker-source-type-pr">
                  <span class="slds-visual-picker__figure slds-visual-picker__text slds-align_absolute-center">
                    <span>
                      <span class="slds-text-heading_large">
                        <span class="slds-icon_container">
                          <svg class="slds-icon slds-icon_large" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#merge"></use>
                          </svg>
                        </span>
                      </span>
                      <span class="slds-text-title">Pull Request</span>
                    </span>
                  </span>
                  <span class="slds-icon_container slds-visual-picker__text-check">
                    <svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#check"></use>
                    </svg>
                  </span>
                </label>
              </div><!-- .slds-visual-picker -->
              <div class="slds-visual-picker slds-visual-picker_medium">
                <input type="radio" id="visual-picker-source-type-branch" v-bind:checked="pipeline.type=='branch'" value="1" name="sourcetype" v-on:click="listBranches()" />
                <label for="visual-picker-source-type-branch">
                  <span class="slds-visual-picker__figure slds-visual-picker__text slds-align_absolute-center">
                    <span>
                      <span class="slds-text-heading_large">
                        <span class="slds-icon_container">
                          <i class="fas fa-code-branch slds-icon_large"></i>
                        </span>
                      </span>
                      <span class="slds-text-title">Branch</span>
                    </span>
                  </span>
                  <span class="slds-icon_container slds-visual-picker__text-check">
                    <svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#check"></use>
                    </svg>
                  </span>
                </label>
              </div><!-- .slds-visual-picker -->
              <div class="slds-visual-picker slds-visual-picker_medium">
                <input type="radio" id="visual-picker-source-type-commit" v-bind:checked="pipeline.type=='commit'" value="1" name="sourcetype" v-on:click="listCommits()" />
                <label for="visual-picker-source-type-commit">
                  <span class="slds-visual-picker__figure slds-visual-picker__text slds-align_absolute-center">
                    <span>
                      <span class="slds-text-heading_large">
                        <span class="slds-icon_container">
                          <svg class="slds-icon slds-icon_large" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#rating"></use>
                          </svg>
                        </span>
                      </span>
                      <span class="slds-text-title">Commit</span>
                    </span>
                  </span>
                  <span class="slds-icon_container slds-visual-picker__text-check">
                    <svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#check"></use>
                    </svg>
                  </span>
                </label>
              </div><!-- .slds-visual-picker -->
            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->
          
          <div class="slds-form-element pipeline-prs" v-if="pipeline.type=='pr'">
            <label class="slds-form-element__label">Pull Reqests</label>
            <div class="slds-form-element__control" v-if="pullrequests!=null">
              <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer pr-table">
                <tbody>
                  <tr class="slds-hint-parent" v-for="(pr, index) in pullrequests">
                    <th scope="row" style="width: 3.25rem;">
                      <div class="slds-truncate">
                        <div class="slds-form-element">
                            <div class="slds-form-element__control">
                              <span class="slds-checkbox">
                                <input type="checkbox" name="all" v-bind:id="('chk-pr-' + index)" v-bind:checked="pullrequestMap[pr.number].checked" v-on:click="checkPR(pr.number, $event)" value="1" />
                                <label class="slds-checkbox__label" v-bind:for="('chk-pr-' + index)">
                                  <span class="slds-checkbox_faux"></span>
                                  <span class="slds-form-element__label"></span>
                                </label>
                              </span>
                            </div>
                          </div><!-- .slds-form-element -->
                      </div>
                    </th>
                    <td>
                      <div class="slds-truncate">
                        <div class="slds-media">
                          <div class="slds-media__figure">
                            <span class="slds-avatar slds-avatar_small slds-avatar_circle slds-m-right_x-small">
                              <span class="slds-icon_container slds-icon-standard-user">
                                <img v-bind:src='pr.user.avatar' />
                              </span>
                            </span>
                          </div>
                          <div class="slds-media__body">
                            <p>{{ pr.title }} &nbsp;&nbsp;
                            <span class="pr-to-icon"><i class="fas fa-arrow-right"></i></span>&nbsp;
                            <span class="slds-badge pr-to-tag">{{ pr.base }}</span>
                            </p>
                            <p><small class="remark">{{ pr.user.loginname }} - #{{ pr.number }}, {{ moment(pr.created_at).fromNow() }}</small></p>
                          </div>
                        </div><!-- .slds-media -->
                      </div>
                    </td>
                  </tr>
                  <tr class="slds-hint-parent" v-if="pullrequests.length == 0">
                    <td>No open Pull Request found. </td>
                  </tr>
                </tbody>
              </table>
            </div><!-- .slds-form-element__control -->

          </div><!-- .slds-form-element -->

          <div class="slds-form-element pipeline-prs" v-if="pipeline.type=='branch' || pipeline.type=='commit'">
            <label class="slds-form-element__label">Branches</label>
            <div class="slds-form-element__control" v-if="branches!=null">
              <div class="slds-select_container input-small">
                <select class="slds-select" v-model="branchName" v-on:change="selectBranch()">
                  <option value="" v-bind:seleced="!pipeline.branch.name">--None--</option>
                  <option v-for="br in branches" v-bind:value="br.name" v-bind:seleced="br.name==pipeline.branch.name">{{ br.name }}</option>
                </select>
              </div>
            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->

          <div class="slds-form-element pipeline-prs" v-if="pipeline.type=='commit' && commits!=null">
            <label class="slds-form-element__label">Commits</label>
            <div class="slds-form-element__control">
              <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer pr-table">
                <tbody>
                  <tr class="slds-hint-parent" v-for="(c, index) in commits">
                    <th scope="row" style="width: 3.25rem;">
                      <div class="slds-truncate">
                        <div class="slds-form-element">
                            <div class="slds-form-element__control">
                              <span class="slds-checkbox">
                                <input type="checkbox" name="all" v-bind:id="('chk-com-' + index)" v-bind:checked="commitMap[c.sha].checked" v-on:click="checkCommit(c.sha, $event)" value="1" />
                                <label class="slds-checkbox__label" v-bind:for="('chk-com-' + index)">
                                  <span class="slds-checkbox_faux"></span>
                                  <span class="slds-form-element__label"></span>
                                </label>
                              </span>
                            </div>
                          </div><!-- .slds-form-element -->
                      </div>
                    </th>
                    <td>
                      <div class="slds-truncate">
                        <div class="slds-media">
                          <div class="slds-media__figure">
                            <span class="slds-avatar slds-avatar_small slds-avatar_circle slds-m-right_x-small">
                              <span class="slds-icon_container slds-icon-standard-user">
                                <img v-bind:src='c.author.avatar' />
                                <img v-bind:src='c.author.avatar' v-if="connection.type!='git'" />
                                <img v-bind:src="'https://www.gravatar.com/avatar/' + CryptoJS.MD5(c.author.loginname).toString()" v-if="connection.type=='git'" />
                              </span>
                            </span>
                          </div>
                          <div class="slds-media__body">
                            <p>{{ c.message }}</p>
                            <p><small class="remark">{{ c.author.loginname }} - #{{ c.sha.substring(0, 6) }}, {{ moment(c.commit_date).fromNow() }}</small></p>
                          </div>
                        </div><!-- .slds-media -->

                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->


        </div><!-- .slds-form -->
      </div><!-- .slds-card__body -->
    </article>
  `
})