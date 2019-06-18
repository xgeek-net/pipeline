Vue.component('app-newpipeline', {
    props: ['connections', 'setting', 'record'],
    data : function () {
      return {
        pipeline : {
          from : '',
          fromApiVersion : '',
          to : '',
          toApiVersion : '',
          action : 'deploy',
          runTests : false,
          checkOnly : false
        },
        validate : false,
        connection : null,
        actionList : [ {value : 'deploy', label : 'Deploy (Add/Update)'}, {value : 'destruct', label : 'Destruct (Delete)'} ],
        apiVersionList : []
      }
    },
    created: function() {
      this.initApiVerList();
    },
    mounted: function () {
      const self = this;
      // Edit pipeline data
      if(self.record) {
        self.pipeline = self.record;
        for(let i in self.connections) {
          const conn = self.connections[i];
          if(conn.id == self.pipeline.from) {
            self.connection = conn;
            break;
          }
        }
        self.validate = true;
      }
    },
    methods: {
      reload : function() {
        this.pipeline = { from : '', fromApiVersion : '', to : '', toApiVersion : '', action : 'deploy', checkOnly : false, runTests : false };
        this.validate = false;
        this.connection = null;
        this.initApiVerList();
      },
      // Init Connection api version list
      initApiVerList : function() {
        const self = this;
        self.apiVersionList = [];
        let apiVersion = parseInt(self.setting.apiVersion || '37.0');
        let apiMaxVersion = parseInt(self.setting.pfMaxApiVersion || '37.0');
        for(let ver = apiVersion; ver <= apiMaxVersion; ver++) {
          self.apiVersionList.push(ver + '.0');
        }
        self.pipeline.fromApiVersion = apiMaxVersion + '.0';
        self.pipeline.toApiVersion = apiMaxVersion + '.0';
      },
      // Event on change from connect select
      changeFromConnect : function(ev) {
        const self = this;
        if(self.pipeline.from == '') {
          self.validate = false;
          self.connection = null;
          return;
        }
        for(let i in self.connections) {
          const conn = self.connections[i];
          if(conn.id == self.pipeline.from) {
            self.connection = conn;
            break;
          }
        }
        const $detail = (self.$refs.gitdetail) ? self.$refs.gitdetail : self.$refs.sfdcdetail;
        if($detail) {
          $detail.reload(self.connection);
        }
        self.validate = true;
      },
      // Event on change to connect select
      changeToConnect : function(ev) {
        const self = this;
        for(let i in self.connections) {
          const conn = self.connections[i];
          if(conn.id == self.pipeline.to) {
            // Default set runTests to true on production org
            if(conn.orgType == 'production') self.pipeline.runTests = true;
            break;
          }
        }
      },
      // Event on click checkOnly checkbox
      checkOnly : function(ev) {
        const checked = ev.target.checked;
        this.pipeline.checkOnly = checked;
      },
      // Event on click runTests checkbox
      checkRunTests : function(ev) {
        const checked = ev.target.checked;
        this.pipeline.runTests = checked;
      },
      /**
       * Save pipeline
       */
      savePipeline : function(ev, callback){
        const self = this;
        ev.target.setAttribute('disabled','disabled');
        const $detail = (self.$refs.gitdetail) ? self.$refs.gitdetail : self.$refs.sfdcdetail;
        if($detail) {
          const now = new Date();
          pipeline = $detail.getPipeline();
          pipeline['from'] = self.pipeline.from;
          pipeline['to'] = self.pipeline.to;
          pipeline['toApiVersion'] = self.pipeline.toApiVersion;
          pipeline['fromApiVersion'] = self.pipeline.fromApiVersion;
          pipeline['action'] = self.pipeline.action;
          pipeline['checkOnly'] = self.pipeline.checkOnly;
          pipeline['runTests'] = self.pipeline.runTests;
          pipeline['status'] = 'ready';
          pipeline['created_at'] = now.toISOString();
          pipeline['updated_at'] = now.toISOString();
        }
        const valid = self.validateData(pipeline);
        if(valid != true) {
          ev.target.removeAttribute('disabled');
          return app.handleError(valid);
        }
        app.showLoading();
        app.request('data-save-pipeline', 
          { pipeline : pipeline },
          function(err, result) {
            app.reloadPipelines({ 
              callback : function() {
                app.hideLoading();
                if(ev) ev.target.removeAttribute('disabled');
                if(err) return app.handleError(err);
                app.activeMenu('pipelines', CONST.titles.pipelines);
                if(callback) {
                  // Run pipeline 
                  return callback(result);
                } else if(app.pipeline) {
                   // Unselect detail
                   app.pipeline = null;
                }
              }  // .callback
            }); // .reloadPipelines
          }
        );
      },
      /**
       * Save and run pipeline
       */
      runPipeline : function(ev){
        const self = this;
        self.savePipeline(ev, function(result) {
          app.runPipeline(result.id);
          app.openPipelineDetail(result.id);
        })
      },
      validateData : function(pipeline) {
        if(!pipeline.from || pipeline.from.length == 0) {
          return 'CONNECTION (FROM) is required';
        }
        if(pipeline.action != 'destruct' && (!pipeline.to || pipeline.to.length == 0)) {
          return 'CONNECTION (TO) is required';
        }
        if(!pipeline.name || pipeline.name.length == 0) {
          return 'Pipeline name is required';
        }
        if(!pipeline.type || pipeline.type.length == 0) {
          return 'Pipeline type is required';
        }
        if(pipeline.type == 'pr' && pipeline.prs.length == 0) {
          return 'Pipeline Pull Request is required';
        }
        if(pipeline.type == 'branch' && Object.keys(pipeline.branch).length == 0) {
          return 'Pipeline Branch is required';
        }
        if(pipeline.type == 'commit' && pipeline.commits.length == 0) {
          return 'Pipeline Commit is required';
        }
        if(pipeline.type == 'changeset' && pipeline.targetTypes.length == 0) {
          return 'Pipeline metadata component is required';
        }
        return true;
      }
    },
    template: `
      <div class="slds-grid slds-wrap" id="pipeline-new">
        <div class="new-pipeline-connect">
          <article class="slds-card">
            <div class="slds-card__header slds-grid">
              <div class="slds-media__figure">
                <span class="slds-icon_container slds-icon-text-default" title="internal_share">
                  <svg class="slds-icon slds-icon_xx_small" aria-hidden="true">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#internal_share"></use>
                  </svg>
                </span>
              </div>
              <header class="slds-media slds-media_center slds-has-flexi-truncate">
                <div class="slds-media__body">
                  <h2 class="slds-card__header-title">
                    CONNECTION <small>(FROM)</small>
                  </h2>
                </div>
              </header>
            </div>
            <div class="slds-card__body slds-card__body_inner">
              <div class="slds-form-element">
                <div class="slds-form-element__control">
                  <div class="slds-select_container">
                    <select class="slds-select" v-model="pipeline.from" v-on:change="changeFromConnect()">
                      <option value="" selected="selected">--None--</option>
                      <option v-for="conn in connections" v-bind:value="conn.id" v-bind:seleced="pipeline.from==conn.id"> [{{ conn.type.toUpperCase() }}] {{ conn.name }}</option>
                    </select>
                  </div>
                </div>
              </div><!-- .slds-form-element -->
              <div class="slds-form-element slds-grid mt1" v-if="(connection!=null && connection.type=='sfdc')">
                <table>
                  <tr>
                    <td style="width: 2.5rem;">
                      <label class="slds-select__label">
                        <span class="slds-checkbox_faux"></span>
                        <span class="slds-form-element__label">API</span>
                      </label>
                    </td>
                    <td>
                      <div class="slds-form-element__control">
                        <div class="slds-select_container">
                          <select class="slds-select" v-model="pipeline.fromApiVersion">
                            <option v-for="ver in apiVersionList" v-bind:value="ver" v-bind:seleced="pipeline.fromApiVersion==ver">{{ ver }}</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td style="width: 4.5rem; text-align: right;">
                      <label class="slds-select__label txt-center">
                        <span class="slds-checkbox_faux"></span>
                        <span class="slds-form-element__label">Action</span>
                      </label>
                    </td>
                    <td>
                      <div class="slds-form-element__control">
                        <div class="slds-select_container">
                          <select class="slds-select" v-model="pipeline.action">
                            <option v-for="act in actionList" v-bind:value="act.value" v-bind:seleced="pipeline.action==act.value">{{ act.label }}</option>
                          </select>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div><!-- .slds-form-element -->
            </div>
            <footer class="slds-card__footer"></footer>
          </article>
        </div><!-- .slds-size_5-of-12 -->
        <div class="new-pipeline-connect-icon mt4" v-if="pipeline.action!='destruct'">
          <div class="slds-align_absolute-center">
            <span class="pipeline-from-icon"><i class="fas fa-arrow-right"></i></span>
          </div>
        </div><!-- .slds-size_1-of-12 -->
        <div class="new-pipeline-connect" v-if="pipeline.action!='destruct'">
          <article class="slds-card ">
            <div class="slds-card__header slds-grid">
              <div class="slds-media__figure">
                <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon-medium slds-m-right_x-small" title="internal_share">
                  <svg class="slds-icon slds-icon_xx_small" aria-hidden="true">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                  </svg>
                </span>
              </div>
              <header class="slds-media slds-media_center slds-has-flexi-truncate">
                <div class="slds-media__body">
                  <h2 class="slds-card__header-title">
                    CONNECTION <small>(TO)</small>
                  </h2>
                </div>
              </header>
            </div>
            <div class="slds-card__body slds-card__body_inner">
              <div class="slds-form-element">
                <div class="slds-form-element__control">
                  <div class="slds-select_container">
                    <select class="slds-select" v-model="pipeline.to" v-on:change="changeToConnect()">
                      <option value="" selected="selected">--None--</option>
                      <option v-for="conn in connections" v-bind:value="conn.id" v-bind:seleced="pipeline.to==conn.id" v-if="(conn.type=='sfdc' && conn.id!=pipeline.from)">{{ conn.name }}</option>
                    </select>
                  </div>
                </div>
              </div><!-- .slds-form-element -->
              <div class="slds-form-element slds-grid mt1">
                <table>
                  <tr>
                    <td style="width: 2.5rem;">
                      <label class="slds-select__label">
                        <span class="slds-checkbox_faux"></span>
                        <span class="slds-form-element__label">API</span>
                      </label>
                    </td>
                    <td>
                      <div class="slds-form-element__control">
                        <div class="slds-select_container">
                          <select class="slds-select" v-model="pipeline.toApiVersion">
                            <option v-for="ver in apiVersionList" v-bind:value="ver" v-bind:seleced="pipeline.toApiVersion==ver">{{ ver }}</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="slds-form-element__control slds-text-align_right">
                        <span class="slds-checkbox">
                          <input type="checkbox" name="options" id="chk-run-tests" v-bind:checked="pipeline.runTests" v-on:click="checkRunTests" value="1" />
                          <label class="slds-checkbox__label" for="chk-run-tests">
                            <span class="slds-checkbox_faux"></span>
                            <span class="slds-form-element__label mr0">Run Tests</span>
                          </label>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="slds-form-element__control slds-text-align_right">
                        <span class="slds-checkbox">
                          <input type="checkbox" name="options" id="chk-check-only" v-bind:checked="pipeline.checkOnly" v-on:click="checkOnly" value="1" />
                          <label class="slds-checkbox__label" for="chk-check-only">
                            <span class="slds-checkbox_faux"></span>
                            <span class="slds-form-element__label mr0">Check Only</span>
                          </label>
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div><!-- .slds-form-element -->
            </div>
            <footer class="slds-card__footer"></footer>
          </article>
        </div><!-- .slds-size_5-of-12 -->

        <div class="slds-size_12-of-12 mt1">
          <app-newpipeline-detail-git v-bind:connection="connection" v-bind:record="record" v-if="(connection!=null && connection.type!='sfdc')" ref="gitdetail"></app-newpipeline-detail-git>
          <app-newpipeline-detail-sfdc v-bind:connection="connection" v-bind:record="record" v-if="(connection!=null && connection.type=='sfdc')" ref="sfdcdetail"></app-newpipeline-detail-sfdc>
        </div><!-- .slds-size_11-of-12 -->

        <div class="slds-size_12-of-12 mt1" v-if="validate==true">
          <div class="slds-wrap slds-text-align_right">
            <button class="slds-button slds-button_neutral" v-on:click="savePipeline">Save</button>
            <button class="slds-button" v-bind:class="{'slds-button_brand': pipeline.action!='destruct', 'slds-button_destructive': pipeline.action=='destruct'}" v-on:click="runPipeline">Run Pipeline</button>
          </div>
        </div><!-- .slds-size_11-of-12 -->
      </div><!-- #pipeline-new -->
    `
  })