Vue.component('app-newpipeline-detail-sfdc', {
  props: ['connection', 'record'],
  data : function () {
    return {
      pipeline : {
        type : null,
        name : ''
      },
      search : {
        type : 'all'
      },
      metadataMap : null,
      metadataTypes : null,
      metadataList : null
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
      self.pipeline = { type : null, name : '' };
    },
    // Edit pipeline data
    setPipeline : function(pipeline) {
      const self = this;
      self.pipeline = pipeline;
    },
    getPipeline : function(){
      return this.pipeline;
    },
    selectEntityType : function(ev) {
      const self = this;
      self.metadataList = self.metadataMap[self.search.type];
    },
    listMetadataList : function(ev) {
      const self = this;
      app.showLoading();
      // Request pull requests
      app.request('sfdc-metadata-list', 
        { connection : self.connection }, 
        function(err, result) {
          console.log('>>> result ', result);
          app.hideLoading();
          if(err) return app.handleError(err);
          self.metadataMap = result;
          self.metadataTypes = Object.keys(result);
        }
      );
    }
  },
  template: `
    <article class="slds-card new-pipeline-detail-sfdc">
      <div class="slds-card__body slds-card__body_inner slds-m-around_small">
        <div class="slds-form slds-form_horizontal">
          <div class="slds-form-element">
            <label class="slds-form-element__label" for="ipt-pipeline-name">Pipeline Name</label>
            <div class="slds-form-element__control">
              <input type="text" id="ipt-pipeline-name" v-model="pipeline.name" class="slds-input input-small" placeholder="Pipeline Name" />
            </div>
          </div><!-- .slds-form-element -->

          <div class="slds-form-element" v-if="metadataMap!=null">
            <label class="slds-form-element__label">Entity Type</label>
            <div class="slds-form-element__control">
              <div class="slds-select_container input-small">
                <select class="slds-select" v-model="search.type" v-on:change="selectEntityType()">
                  <option value="all" v-bind:seleced="search.type=='all'">All</option>
                  <option v-for="metaType in metadataTypes" v-bind:value="metaType" v-bind:seleced="search.type==metaType">{{ metaType }}</option>
                </select>
              </div>
            </div><!-- .slds-form-element__control -->
          </div><!-- .slds-form-element -->

          <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer app-table" v-if="metadataList!=null">
            <thead>
              <tr class="slds-text-title_caps">
                <th scope="col" class="main-col" style="width: 3.25rem;">
                  <div class="slds-truncate" title="ALL">
                    <div class="slds-form-element">
                      <div class="slds-form-element__control">
                        <span class="slds-checkbox">
                          <input type="checkbox" name="all" v-bind:id="chk-metadata-all" v-on:click="checkAll" value="all" />
                          <label class="slds-checkbox__label" v-bind:for="chk-metadata-all">
                            <span class="slds-checkbox_faux"></span>
                            <span class="slds-form-element__label"></span>
                          </label>
                        </span>
                      </div>
                    </div><!-- .slds-form-element -->
                  </div>
                </th>
                <th scope="col">
                  <div class="slds-truncate" title="Name">Name</div>
                </th>
                <th scope="col">
                  <div class="slds-truncate" title="Type">Type</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in metadataList">
                <th scope="row">
                  <div class="slds-truncate">
                    <div class="slds-form-element">
                      <div class="slds-form-element__control">
                        <span class="slds-checkbox">
                          <input type="checkbox" name="all" v-bind:id="('chk-metadata-' + index)" v-on:click="checkMetadata(index, $event)" value="1" />
                          <label class="slds-checkbox__label" v-bind:for="('chk-metadata-' + index)">
                            <span class="slds-checkbox_faux"></span>
                            <span class="slds-form-element__label"></span>
                          </label>
                        </span>
                      </div>
                    </div><!-- .slds-form-element -->
                  </div>
                </th>
                <td>
                  <div class="slds-truncate">{{ row.label || row.fullName }}</div>
                </td>
                <td>
                  <div class="slds-truncate">{{ row.ObjectLabel || row.type }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          

          <div class="slds-size_11-of-12 mt1">
            <div class="slds-wrap slds-text-align_right">
              <button class="slds-button slds-button_neutral" v-on:click="listMetadataList">Run</button>
            </div>
          </div><!-- .slds-size_11-of-12 -->


        </div><!-- .slds-form -->
      </div><!-- .slds-card__body -->
    </article>
  `
})