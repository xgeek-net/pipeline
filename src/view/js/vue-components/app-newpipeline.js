Vue.component('app-newpipeline', {
    props: ['connections'],
    data : function () {
      return {
        pipeline : {
          from : '',
          to : ''
        },
        validate : false,
        connection : null,
      }
    },
    methods: {
      changeConnect : function(ev) {
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
        if(self.$refs.detail) {
          self.$refs.detail.reload();
        }
        self.validate = true;
      },
      runPipeline : function(ev){
        const self = this;
        ev.target.setAttribute('disabled','disabled');
        let depipelinetail = null;
        if(self.$refs.detail) {
          const now = new Date();
          pipeline = self.$refs.detail.getPipeline();
          pipeline['from'] = self.pipeline.from;
          pipeline['to'] = self.pipeline.to;
          pipeline['status'] = 'ready';
          pipeline['created_at'] = now.toISOString();
          pipeline['updated_at'] = now.toISOString();
        }
        app.showLoading();
        app.request('data-new-pipeline', 
          { pipeline : pipeline },
          function(err, result) {
            console.log('>>>> result ', result);
            app.hideLoading();
            if(err) return app.handleError(err);
            app.runPipeline(result.id);
            app.activeMenu('pipelines', CONST.titles.pipelines);
            app.openPipelineDetail(result.id);
            if(ev) ev.target.removeAttribute('disabled');
          }
        );
      }
    },
    template: `
      <div class="slds-grid slds-wrap" id="pipeline-new">
        <div class="slds-size_5-of-12 new-pipeline-connect">
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
                    <select class="slds-select" v-model="pipeline.from" v-on:change="changeConnect()">
                      <option value="" selected>--None--</option>
                      <option v-for="conn in connections" v-bind:value="conn.id">{{ conn.name }}</option>
                    </select>
                  </div>
                </div>
              </div><!-- .slds-form-element -->
            </div>
            <footer class="slds-card__footer"></footer>
          </article>
        </div><!-- .slds-size_5-of-12 -->
        <div class="slds-size_1-of-12 mt2">
          <div class="slds-align_absolute-center">
            <span class="pipeline-from-icon"><i class="fas fa-arrow-right"></i></span>
          </div>
        </div><!-- .slds-size_1-of-12 -->
        <div class="slds-size_5-of-12 new-pipeline-connect">
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
                    <select class="slds-select" v-model="pipeline.to">
                      <option value="" selected>--None--</option>
                      <option v-for="conn in connections" v-bind:value="conn.id" v-if="(conn.type=='sfdc' && conn.id!=pipeline.from)">{{ conn.name }}</option>
                    </select>
                  </div>
                </div>
              </div><!-- .slds-form-element -->
            </div>
            <footer class="slds-card__footer"></footer>
          </article>
        </div><!-- .slds-size_5-of-12 -->

        <div class="slds-size_11-of-12 mt1">
          <app-newpipeline-detail-git v-bind:connection="connection" v-if="connection!=null" ref="detail"></app-newpipeline-detail-git>
        </div><!-- .slds-size_11-of-12 -->

        <div class="slds-size_11-of-12 mt1" v-if="validate">
          <div class="slds-wrap slds-text-align_right">
          <button class="slds-button slds-button_brand" v-on:click="runPipeline">Run Pipeline</button>
          </div>
        </div><!-- .slds-size_11-of-12 -->
      </div><!-- #pipeline-new -->
    `
  })