Vue.component('app-newpipeline-detail-git', {
  props: ['connection', 'record'],
  data : function () {
    return {
      pipeline : {
        type : null,
        name : '',
        prs : [],
        branch : '',
        commits : []
      },
      pullrequests : null,
      branches : null,
      commits : null
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
      self.pipeline = { type : null, name : '', prs : [], branch : '', commits : [] };
      self.pullrequests = null;
    },
    // Edit pipeline data
    setPipeline : function(pipeline) {
      const self = this;
      self.pipeline = pipeline;
      // Fire self.listPullRequests(); OR self.listBranches(); OR self.listCommits();
      const typeEle = document.getElementById('visual-picker-source-type-' + self.pipeline.type);
      if(typeEle) {
        typeEle.click();
      }
    },
    getPipeline : function(){
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
        }
      );
      
    },
    listBranches : function(ev) {
      const self = this;
      self.pipeline.type = 'branch';
      app.showLoading();
      //console.log('>>> listBranches ',self.pipeline);
      // Request branches
      app.request('git-branches', 
        self.connection,
        function(err, branches) {
          app.hideLoading();
          if(err) return app.handleError(err);
          //console.log('>>> git-listBranches callback ',err, branches);
          self.branches = branches;
        }
      );
    },
    listCommits : function(ev) {
      const self = this;
      self.pipeline.type = 'commit';
      app.showLoading();
      //console.log('>>> listCommits ',self.pipeline);
      // Request branches
      app.request('git-branches', 
        self.connection,
        function(err, branches) {
          app.hideLoading();
          if(err) return app.handleError(err);
          //console.log('>>> git-commits callback ',err, branches);
          self.branches = branches;
        }
      );
    },
    checkPR : function(prNum, ev) {
      const self = this;
      const checked = ev.target.checked;
      if(checked && self.pipeline.prs.indexOf(prNum) < 0) {
        self.pipeline.prs.push(prNum);
      }
      if(!checked && self.pipeline.prs.indexOf(prNum) >= 0) {
        var index = self.pipeline.prs.indexOf(prNum);
        self.pipeline.prs.splice(index, 1);
      }
    },
    selectBranch : function(ev) {
      const self = this;
      if(self.pipeline.type != 'commit') return;
      app.showLoading();
      // Request pull requests
      app.request('git-branch-commits', 
        {connection : self.connection,
         branch : self.pipeline.branch},
        function(err, commits) {
          app.hideLoading();
          if(err) return app.handleError(err);
          console.log('>>> git-pullrequests callback ',err, commits);
          self.commits = commits;
        }
      );
    },
    checkCommit : function(sha, ev) {
      const self = this;
      const checked = ev.target.checked;
      if(checked && self.pipeline.commits.indexOf(sha) < 0) {
        self.pipeline.commits.push(sha);
      }
      if(!checked && self.pipeline.commits.indexOf(sha) >= 0) {
        var index = self.pipeline.commits.indexOf(sha);
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
            <label class="slds-form-element__label">Source Type</label>
            <div class="slds-form-element__control">
              <div class="slds-visual-picker slds-visual-picker_medium">
                <input type="radio" id="visual-picker-source-type-pr" value="1" name="sourcetype" v-on:click="listPullRequests()" />
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
                <input type="radio" id="visual-picker-source-type-branch" value="1" name="sourcetype" v-on:click="listBranches()" />
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
                <input type="radio" id="visual-picker-source-type-commit" value="1" name="sourcetype" v-on:click="listCommits()" />
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
                                <input type="checkbox" name="all" v-bind:id="('chk-pr-' + index)" v-on:click="checkPR(pr.number, $event)" value="1" />
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
                </tbody>
              </table>

            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->

          <div class="slds-form-element pipeline-prs" v-if="pipeline.type=='branch' || pipeline.type=='commit'">
            <label class="slds-form-element__label">Branches</label>
            <div class="slds-form-element__control" v-if="branches!=null">
              <div class="slds-select_container input-small">
                <select class="slds-select" v-model="pipeline.branch" v-on:change="selectBranch()">
                  <option value="" selected="selected">--None--</option>
                  <option v-for="br in branches" v-bind:value="br.name">{{ br.name }}</option>
                </select>
              </div>
            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->

          <div class="slds-form-element pipeline-prs" v-if="pipeline.type=='branch' && commits!=null">
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
                                <input type="checkbox" name="all" v-bind:id="('chk-com-' + index)"  v-on:click="checkCommit(c.sha, $event)" value="1" />
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