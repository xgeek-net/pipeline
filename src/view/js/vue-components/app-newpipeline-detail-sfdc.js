Vue.component('app-newpipeline-detail-sfdc', {
  props: ['connection', 'record'],
  data : function () {
    return {
      pipeline : {
        type : null,
        name : '',
        targetTypes : [] 
      },
      search : {
        type : 'all',
        keyword : null,
        showChecked : false
      },
      metadataMap : null,
      metadataTypes : null,
      metadataTypeOptions : null,
      metadataList : null,
      metaChecked : 0,
      hasLabelTypes : ['all', 'CustomField', 'CustomObject', 'CustomTab', 'CompactLayout', 'Dashboard', 'Document', 
                      'EmailTemplate', 'Group', 'ListView', 'RecordType', 'Report', 'Role', 'SharingReason', 'WorkflowAlert'],
      hasObjectTypes : ['all', 'BusinessProcess', 'CustomField', 'CustomMetadata', 'CompactLayout', 'FieldSet', 'QuickAction', 'WebLink', 'ListView', 'Layout', 
                      'RecordType', 'SharingReason', 'ValidationRule', 'WorkflowAlert', 'WorkflowRule', 'WorkflowFieldUpdate',
                      // Folders
                      'Dashboard', 'Report', 'EmailTemplate', 'Document'],
      allChecked : false
    }
  },
  mounted: function () {
    const self = this;
    if(self.record) {
      self.setPipeline(self.record);
    }
    if(self.connection) {
      self.listMetadataList();
    }
  },
  methods: {
    /**
     * Reload component when connection changed
     * Called from parent component
     */
    reload : function() {
      const self = this;
      self.pipeline = { type : null, name : '', targetTypes : [] };
      self.search = { type : 'all', keyword : null };
      self.metadataMap = null;
      self.metadataTypes = null;
      self.metadataTypeOptions = null;
      self.metadataList = null;
      self.metaChecked = 0;

      if(self.connection) {
        self.listMetadataList();
      }
    },
    // Edit pipeline data
    setPipeline : function(pipeline) {
      const self = this;
      self.pipeline = pipeline;
    },
    getPipeline : function() {
      const self = this;
      self.pipeline.targetTypes = [];
      for(let key in self.metadataMap) {
        let members = [];
        let folders = [];
        for(let meta of self.metadataMap[key]) {
          if(meta.MetaChecked == true) {
            // Add Folder
            if(['Dashboard', 'Report', 'EmailTemplate', 'Document'].indexOf(meta.type) >= 0
              && meta.folder && folders.indexOf(meta.folder)
            ) {
              folders.push(meta.folder);
              members.push(meta.folder);
            }
            const memberName = (meta.object) ? meta.object + '.' + meta.fullName : meta.fullName;
            members.push(memberName);
          }
        }
        if(members.length > 0) {
          self.pipeline.targetTypes.push({ name : key, members : members });
        }
      }
      self.pipeline.type = 'changeset';
      return self.pipeline;
    },
    selectEntityType : function(ev) {
      this.search.keyword = '';
      this.searchMetadata();
    },
    listMetadataList : function(ev) {
      const self = this;
      app.showLoading();
      // Request pull requests
      app.request('sfdc-metadata-list', 
        { connection : self.connection }, 
        function(err, result) {
          // { components : components, types : {} }
          console.log('>>> result ', result);
          app.hideLoading();
          if(err) return app.handleError(err);
          self.metadataMap = result.components;
          self.metadataTypes = result.types;
          self.metadataTypeOptions = self.sortByLabel(result.types);
          self.metaChecked = 0;
          if(result && self.pipeline.targetTypes.length > 0) {
            self.initMetaCheck();
          }
          self.searchMetadata();
        }
      );
    },

    // Sort type by label
    sortByLabel : function(metadataTypes) {
      if(metadataTypes == null) return null;
      let types = [];
      for(mtype in metadataTypes) {
        types.push({ value : mtype, label : metadataTypes[mtype] });
      }
      types = types.sort(function(a, b){
        var x = a.label;
        var y = b.label;
        if (x > y) return 1;
        if (x < y) return -1;
        return 0;
      });
      return types;
    },
    // Check on edit pipeline
    initMetaCheck : function() {
      const self = this;
      self.metaChecked = 0;
      let types = {};
      for(let type of self.pipeline.targetTypes) {
        types[type.name] = type.members;
      }
      for(let key in self.metadataMap) {
        for(let meta of self.metadataMap[key]) {
          const memberName = (meta.object) ? meta.object + '.' + meta.fullName : meta.fullName;
          if(types.hasOwnProperty(key) && types[key].indexOf(memberName) >= 0) {
            // Check target component
            meta['MetaChecked'] = true;
            self.metaChecked++;
          }
        }
      }
    },
    searchMetadata : function() {
      const self = this;
      self.allChecked = true;
      self.metadataList = [];
      const _pushMetadaList = function(metaType, targets) {
        for(let i = 0; i < targets.length; i++) {
          let meta = targets[i];
          let willShow = false;
          // Filter by keyword
          let keyword = self.search.keyword;
          if(typeof keyword == 'undefined' || keyword == null || keyword.length ==0) {
            willShow = true;
          } else {
            keyword = keyword.toUpperCase();
            if((meta.label && meta.label.toUpperCase().indexOf(keyword) >= 0) || 
              (meta.fullName && meta.fullName.toUpperCase().indexOf(keyword) >= 0)) {
              willShow = true;
            }
          }
          // Filter by check
          if(self.search.showChecked == true) {
            willShow = meta.MetaChecked;
          }
          if(willShow == false) continue;
          if(!meta.hasOwnProperty('MetaIndex')) meta['MetaIndex'] = i;
          if(!meta.hasOwnProperty('MetaType')) meta['MetaType'] = metaType;
          if(!meta.hasOwnProperty('MetaChecked')) {
            meta['MetaChecked'] = false;
            self.allChecked = false;
          } else {
            // Set to false if MetaChecked is false
            self.allChecked = meta.MetaChecked;
          }
          self.metadataList.push(meta);
        }
      }
      if(self.search.type == 'all') {
        for(let key in self.metadataMap) {
          _pushMetadaList(key, self.metadataMap[key]);
        }
      } else {
        _pushMetadaList(self.search.type, self.metadataMap[self.search.type]);
      }
    },
    checkAll : function(ev) {
      const self = this;
      const checked = ev.target.checked;
      let metaList = [];
      for(let i = 0; i < self.metadataList.length; i++) {
        const meta = self.metadataList[i];
        meta['MetaChecked'] = checked;
        metaList.push(meta);
        self.metadataMap[meta.MetaType][meta.MetaIndex]['MetaChecked'] = checked;
      }
      // Fix for fire update event
      self.metadataList = metaList;
      self.metaChecked = self.countChecked();
    },
    checkMetadata : function(index, ev) {
      const self = this;
      const checked = ev.target.checked;
      let metaList = self.metadataList;
      const meta = metaList[index];
      metaList[index]['MetaChecked'] = checked;
      self.metadataMap[meta.MetaType][meta.MetaIndex]['MetaChecked'] = checked;
      // Fix for fire update event
      self.metadataList = metaList;
      self.metaChecked = self.countChecked();
      if(checked == false) {
        self.allChecked = false;
      } else {
        self.allChecked = true;
        for(let i = 0; i < metaList.length; i++) {
          if(metaList[i].MetaChecked == false) {
            self.allChecked = false;
            break;
          }
        } // .metaList
      }
    },
    showOnlyChecked : function(ev) {
      const self = this;
      self.search.showChecked = ev.target.checked;
      // Clear search condition
      if(self.search.showChecked == true) {
        self.search.type = 'all';
        self.search.keyword = '';
      }
      self.searchMetadata();
    },
    countChecked : function() {
      const self = this;
      let count = 0;
      for(let key in self.metadataMap) {
        for(let meta of self.metadataMap[key]) {
          if(meta.MetaChecked == true) count++;
        }
      }
      return count;
    }
  },
  template: `
    <article class="slds-card new-pipeline-detail-sfdc">
      <div class="slds-card__body slds-card__body_inner slds-m-top_small slds-m-bottom_small">
        <div class="slds-wrap slds-grid">
          <div class="md-wrap">
            <div class="slds-form-element slds-grid">
              <label class="slds-form-element__label slds-size_3-of-12" for="ipt-pipeline-name">Pipeline Name</label>
              <div class="slds-form-element__control slds-size_9-of-12">
                <input type="text" id="ipt-pipeline-name" v-model="pipeline.name" class="slds-input input-small" placeholder="Pipeline Name" />
              </div>
            </div><!-- .slds-form-element -->
          </div><!-- .slds-size_1-of-3 -->  
        </div><!-- .slds-grid -->  
        <div class="slds-form slds-form_horizontal">
          <div v-if="metadataMap!=null" class="slds-wrap slds-grid pr10 mt1">
            <div class="slds-size_1-of-3">
              <div class="slds-form-element">
                <label class="slds-form-element__label slds-size_3-of-12 slds-text-align_left">Entity Type</label>
                <div class="slds-form-element__control">
                  <div class="slds-select_container input-small">
                    <select class="slds-select" v-model="search.type" v-on:change="selectEntityType()">
                      <option value="all" v-bind:seleced="search.type=='all'">All</option>
                      <option v-for="metaType in metadataTypeOptions" v-bind:value="metaType.value" v-bind:seleced="search.type==metaType.value">{{ metaType.label }}</option>
                    </select>
                  </div>
                </div><!-- .slds-form-element__control -->
              </div><!-- .slds-form-element -->
            </div>  
            <div class="slds-size_1-of-3 text-left">
              <div class="slds-form-element slds-m-left_medium">
                <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_right w80">
                  <svg class="slds-icon slds-input__icon slds-input__icon_right slds-icon-text-default">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#search"></use>
                  </svg>
                  <input type="text" id="ipt-keyword" v-model="search.keyword" v-on:keyup="searchMetadata" class="slds-input input-small" placeholder="Search Component" />
                </div>
              </div><!-- .slds-form-element -->
            </div>  
            <div class="slds-size_1-of-3">
              <div class="slds-wrap slds-text-align_right">
                <span class="slds-checkbox">
                  <input type="checkbox" name="options" id="chk-show-checked" v-on:click="showOnlyChecked" value="1" />
                  <label class="slds-checkbox__label" for="chk-show-checked">
                    <span class="slds-checkbox_faux"></span>
                    <span class="slds-form-element__label">&nbsp;Show Checked ({{ metaChecked }})</span>
                  </label>
                </span>
                <div class="slds-button-group inline-group" role="group">
                  <button class="slds-button slds-button_neutral" disabled="disabled" v-on:click="listMetadataList">
                    <svg class="slds-button__icon slds-button__icon_left">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#download"></use>
                    </svg>Export</button>
                  <button class="slds-button slds-button_neutral" disabled="disabled" v-on:click="listMetadataList">
                    <svg class="slds-button__icon slds-button__icon_left">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#upload"></use>
                    </svg>Import</button>
                </div>
              </div>
            </div>
          </div><!-- .slds-grid -->  

          <div v-if="metadataList!=null" class="slds-wrap slds-grid mt1 metadata-select-table">
            <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer app-table">
              <thead>
                <tr class="slds-text-title_caps">
                  <th scope="col" class="main-col" style="width: 3.25rem;">
                    <div class="slds-truncate">
                      <div class="slds-form-element">
                        <div class="slds-form-element__control">
                          <span class="slds-checkbox">
                            <input type="checkbox" name="all" id="chk-metadata-all" v-bind:checked="allChecked" v-on:click="checkAll" value="all" />
                            <label class="slds-checkbox__label" for="chk-metadata-all">
                              <span class="slds-checkbox_faux"></span>
                              <span class="slds-form-element__label"></span>
                            </label>
                          </span>
                        </div><!-- .slds-form-element__control -->
                      </div><!-- .slds-form-element -->
                    </div>
                  </th>
                  <th scope="col">
                    <div class="slds-truncate" title="Name">Name</div>
                  </th>
                  <th scope="col" v-if="hasLabelTypes.indexOf(search.type)>=0">
                    <div class="slds-truncate" title="Label">Label</div>
                  </th>
                  <th scope="col" v-if="hasObjectTypes.indexOf(search.type)>=0">
                    <div class="slds-truncate" title="Type">Object/Folder</div><!-- JP:種別 -->
                  </th>
                  <th scope="col" v-if="search.type=='all'">
                    <div class="slds-truncate" title="Entity">Entity Type</div><!-- JP:種類 -->
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
                            <input type="checkbox" name="all" v-bind:id="('chk-metadata-' + index)" v-bind:checked="row.MetaChecked" v-on:click="checkMetadata(index, $event)" value="1" />
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
                    <div class="slds-truncate">{{ row.customName || row.fullName }}</div>
                  </td>
                  <td v-if="hasLabelTypes.indexOf(search.type)>=0">
                    <div class="slds-truncate">{{ row.label }}</div>
                  </td>
                  <td v-if="hasObjectTypes.indexOf(search.type)>=0">
                    <div class="slds-truncate">{{ row.objectLabel || row.folderLabel }}</div>
                  </td>
                  <td v-if="search.type=='all'">
                    <div class="slds-truncate">{{ metadataTypes[row.type] }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div><!-- .slds-form -->
      </div><!-- .slds-card__body -->
    </article>
  `
})