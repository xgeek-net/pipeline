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
        object : 'all',
        keyword : null,
        showChecked : false
      },
      metadataMap : null,
      metadataTypes : null,
      metadataTypeOptions : null,
      metadataObjectOptions : null,
      metadataList : null,
      metaChecked : 0,
      allChecked : false,
      sortByField : 'NAME',
      sortByASC : true,
      showModifiedColumn : false,
      // Const
      excelHandler : new ExcelHandler(),
      EXCEL_TYPES : [
        'application/vnd.ms-excel', 
        'application/msexcel',
        'application/x-msexcel',
        'application/x-ms-excel',
        'application/x-excel',
        'application/x-dos_ms_excel',
        'application/xls',
        'application/x-xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      OBJECT_TYPES : ['all', 'ApprovalProcess', 'BusinessProcess', 'CustomField', 'CustomMetadata', 'CompactLayout', 'FieldSet', 'QuickAction', 'WebLink', 'ListView', 'Layout', 
                      'RecordType', 'SharingReason', 'ValidationRule', 'WorkflowAlert', 'WorkflowRule', 'WorkflowFieldUpdate',
                      // Folders
                      'Dashboard', 'Report', 'EmailTemplate', 'Document'],
      CHILD_TYPES : ['CustomField', 'BusinessProcess', 'RecordType', 'WebLink', 'ValidationRule', 'SharingReason', 'ListView', 'FieldSet', 'CompactLayout',
                      'WorkflowAlert', 'WorkflowTask', 'WorkflowOutboundMessage', 'WorkflowFieldUpdate', 'WorkflowRule', 'WorkflowTimeTrigger', 'WorkflowActionReference']
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
    reload : function(conn) {
      const self = this;
      self.pipeline = { type : null, name : '', targetTypes : [] };
      self.search = { type : 'all', object : 'all', keyword : null, showChecked : false };
      self.metadataMap = null;
      self.metadataTypes = null;
      self.metadataTypeOptions = null;
      self.metadataObjectOptions = null;
      self.metadataList = null;
      self.sortByField = 'NAME';
      self.sortByASC = true;
      self.showModifiedColumn = false;
      self.metaChecked = 0;
      if(conn) {
        self.connection = conn;
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
            const childTypes = self.CHILD_TYPES;
            const memberName = (childTypes.indexOf(meta.type) >= 0 && meta.object) ? meta.object + '.' + meta.fullName : meta.fullName;
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
      this.search.object = 'all';
      this.search.keyword = '';
      this.searchMetadata();
    },
    selectCustomObject : function(ev) {
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
          self.metadataObjectOptions = self.getObjectOptions(self.metadataMap.CustomField);
          self.metaChecked = 0;
          if(result && self.pipeline.targetTypes.length > 0) {
            self.initMetaCheck();
          }
          self.searchMetadata();
        }
      );
    },

    // Sort result list
    handleSort : function(fieldName, sortBy) {
      const self = this;
      if(self.metadataList == null || self.metadataList.length == 0) return;
      if(self.sortByField == fieldName && self.sortBy == sortBy) return;
      self.sortByField = fieldName;
      self.sortByASC = sortBy;
      self.metadataList = self.sortList(self.metadataList);
    },

    // Export metadata to Excel
    handleExport : function(ev) {
      const self = this;
      ev.target.setAttribute('disabled','disabled');
      let data = { 'Metadata' : [['TYPE', 'NAME', 'OBJECT/FOLDER', 'REMARKS', 'LASTMODIFIEDDATE', 'LASTMODIFIEDBY']], 'Reference' : [['TYPE']] };
      let targets = [];
      for(let key in self.metadataMap) {
        for(let meta of self.metadataMap[key]) {
          if(meta.MetaChecked !== true) continue;
          targets.push(meta);
        }
      }
      // sort again
      targets = self.sortList(targets);
      for(let meta of targets) {
        const objLabel = meta.objectLabel || meta.folderLabel;
        let line = [];
        line.push(self.metadataTypes[meta.type]); // Entity Type
        line.push(meta.customName || meta.fullName);  // Name
        line.push(objLabel || '');  // Object / Folder
        line.push((meta.customName) ? meta.fullName : '');  // Remark(API Name)
        line.push(meta.lastModifiedDate || '');  // lastModifiedDate
        line.push(meta.lastModifiedByName || '');  // lastModifiedByName
        data.Metadata.push(line);
      }

      for(let metaType of self.metadataTypeOptions) {
        if(metaType == 'all') continue;
        let line = [metaType.label];
        data.Reference.push(line);
      }
      self.excelHandler.write(data, self.pipeline.name);
      ev.target.removeAttribute('disabled');
    },

    // Import metadata from Excel
    handleUploadFile : function(ev) {
      const self = this;
      ev.target.setAttribute('disabled','disabled');
      const files = ev.target.files;

      if(!files || self.excelHandler.SUPPORT_TYPES.indexOf(files[0].type) < 0) {
        ev.target.removeAttribute('disabled');
        if(self.$refs.file) self.$refs.file.value = '';
        return app.handleError('Excel file is required.');
      }
      self.excelHandler.read(files[0], function(err, lines) {
        //console.log('>>>>line', err, lines);
        // Clear file value
        if(self.$refs.file) self.$refs.file.value = '';
        if(err) {
          ev.target.removeAttribute('disabled');
          return app.handleError(err);
        }
        if(!lines || lines.length == 0 || !lines[0].hasOwnProperty('NAME') || !lines[0].hasOwnProperty('TYPE')) {
          ev.target.removeAttribute('disabled');
          return app.handleError('Data is not found.');
        }
        let typeMap = {}; // 'Apexクラス' : 'ApexClass'
        for(mtype in self.metadataTypes) {
          typeMap[self.metadataTypes[mtype]] = mtype;
        }
        // Set all check off
        for(let key in self.metadataMap) {
          for(let i = 0; i < self.metadataMap[key].length; i++) {
            self.metadataMap[key][i]['MetaChecked'] = false;
          }
        }

        let warings = [];
        self.metaChecked = 0;
        for(let line of lines) {
          const rowNum = line.__rowNum__;
          if(!typeMap.hasOwnProperty(line.TYPE)) {
            warings.push('Line ' + rowNum + ': TYPE "' + line.TYPE + '" is not found.');
            continue;
          }
          const metaType = typeMap[line.TYPE];
          let exist = false;
          for(let i = 0; i < self.metadataMap[metaType].length; i++) {
            const meta = self.metadataMap[metaType][i];
            const name = (line.NAME) ? line.NAME.trim() : null;
            const objectLabel = (line['OBJECT/FOLDER']) ? line['OBJECT/FOLDER'].trim() : null;
            if((meta.customName && name === meta.customName) || name === meta.fullName) {
              if((meta.objectLabel && objectLabel == meta.objectLabel) || !meta.objectLabel) {
                exist = true;
                self.metadataMap[metaType][i]['MetaChecked'] = true;
                self.metaChecked++;
                // console.log('>>>>Checked', self.metadataMap[metaType][i]);
              }
            }
          }
          if(exist == false) {
            warings.push('Line ' + rowNum + ': NAME "' + line.NAME + '" is not found.');
            continue;
          }
        }
        if(warings.length > 0) {
          app.handleError({ type : 'warning', message : warings.join('<br />') })
        }

        // Show Checked
        self.search = { type : 'all', object : 'all', keyword : null, showChecked : true };
        self.searchMetadata();
        ev.target.removeAttribute('disabled');
      });
    },

    // Sort type by label
    sortByLabel : function(metadataTypes) {
      if(metadataTypes == null) return null;
      let types = [];
      for(mtype in metadataTypes) {
        types.push({ value : mtype, label : metadataTypes[mtype] });
      }
      types = types.sort(function(a, b){
        const x = a.label.toUpperCase();
        const y = b.label.toUpperCase();
        if (x > y) return 1;
        if (x < y) return -1;
        return 0;
      });
      return types;
    },
    // sort list by field and sortBy
    sortList : function(metadataList) {
      const self = this;
      metadataList = metadataList.sort(function(a, b){
        let x, y;
        if(self.sortByField == 'NAME') {
          x = a.customName || a.fullName;
          y = b.customName || b.fullName;
        } else if(self.sortByField == 'OBJECT') {
          x = a.objectLabel || a.folderLabel;
          y = a.objectLabel || a.folderLabel;
        } else if(self.sortByField == 'ENTITY') {
          x = self.metadataTypes[a.type];
          y = self.metadataTypes[b.type];
        } else if(self.sortByField == 'lastModifiedDate' || self.sortByField == 'lastModifiedByName') {
          x = a[self.sortByField] || '';
          y = b[self.sortByField] || '';
        }
        x = (x) ? x.toUpperCase() : ''; 
        y = (y) ? y.toUpperCase() : '';
        if (x > y) return (self.sortByASC) ? 1 : -1;
        if (x < y) return (self.sortByASC) ? -1 : 1;
        return 0;
      });
      return metadataList;
    },
    // Get all object from field metadata
    getObjectOptions : function(fields) {
      if(!fields || fields.length == 0) return null;
      let objects = [];
      let values = [];
      for(f of fields) {
        if(values.indexOf(f.object) >= 0) continue;
        // Filter duplicate
        values.push(f.object);
        objects.push({ value : f.object, label : f.objectLabel });
      }
      objects = objects.sort(function(a, b){
        const x = a.label.toUpperCase();
        const y = b.label.toUpperCase();
        if (x > y) return 1;
        if (x < y) return -1;
        return 0;
      });
      return objects;
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
          const memberName = (meta.object && key !== 'Layout' && key !== 'ApprovalProcess') ? meta.object + '.' + meta.fullName : meta.fullName;
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
      self.showModifiedColumn = false;
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
            if(meta.customName) {
              // Match customName(Label) first
              if(meta.customName.toUpperCase().indexOf(keyword) >= 0) willShow = true;
            } else if(meta.fullName && meta.fullName.toUpperCase().indexOf(keyword) >= 0) {
              willShow = true;
            }
          }
          // Filter by object (only CustomField)
          if(metaType == 'CustomField' && self.search.object != 'all') {
            if(meta.object == self.search.object && willShow) {
              willShow = true;
            } else {
              willShow = false;
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
          if(meta.lastModifiedDate && self.showModifiedColumn == false) {
            // Show lastModifiedDate and lastModifiedByName Columns
            self.showModifiedColumn = true;
          }
          self.metadataList.push(meta);
        }
        // Sort default 
        self.handleSort('NAME', true);
      }
      if(self.search.type == 'all') {
        for(let key in self.metadataMap) {
          _pushMetadaList(key, self.metadataMap[key]);
        }
      } else {
        _pushMetadaList(self.search.type, self.metadataMap[self.search.type]);
      }
    },
    // Event on click check all checkbox
    checkAll : function(ev) {
      const self = this;
      const checked = ev.target.checked;
      self.allChecked = checked;
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
    // Event on click row checkbox
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
      const checked = ev.target.checked;
      self.search.showChecked = checked;
      // Clear search condition
      if(checked == true) {
        self.search.type = 'all';
        self.search.object = 'all';
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
        <div class="slds-form slds-form_horizontal slds-wrap slds-grid">
          <div class="slds-size_1-of-3">
            <div class="slds-form-element">
              <label class="slds-form-element__label slds-size_3-of-12 slds-text-align_left" for="ipt-pipeline-name">Pipeline Name</label>
              <div class="slds-form-element__control slds-size_9-of-12">
                <input type="text" id="ipt-pipeline-name" v-model="pipeline.name" class="slds-input input-small" placeholder="Pipeline Name" />
              </div>
            </div><!-- .slds-form-element -->
          </div><!-- .slds-size_1-of-3 -->  
          <div class="slds-size_2-of-3">
            <div class="slds-wrap slds-text-align_right">
              <input type="file" ref="file" class="slds-hide" v-on:change="handleUploadFile">
              <div class="slds-button-group inline-group" role="group">
                <button class="slds-button slds-button_neutral" v-bind:disabled="metadataList==null || metaChecked==0" v-on:click="handleExport">
                  <svg class="slds-button__icon slds-button__icon_left">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#download"></use>
                  </svg>Export</button>
                <button class="slds-button slds-button_neutral" v-bind:disabled="metadataList==null" v-on:click="$refs.file.click()">
                  <svg class="slds-button__icon slds-button__icon_left">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#upload"></use>
                  </svg>Import</button>
              </div>
            </div>

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
            <!-- show  -->
            <div class="text-left slds-size_3-of-12 select-middle-col" v-if="search.type=='CustomField' && metadataObjectOptions != null">
              <div class="slds-form-element__control">
                <div class="slds-select_container input-small">
                  <select class="slds-select" v-model="search.object" v-on:change="selectCustomObject()">
                    <option value="all" v-bind:seleced="search.object=='all'">All</option>
                    <option v-for="objMeta in metadataObjectOptions" v-bind:value="objMeta.value" v-bind:seleced="search.object==objMeta.value">{{ objMeta.label }}</option>
                  </select>
                </div>
              </div><!-- .slds-form-element__control -->
            </div>
            <div class="text-left" v-bind:class="{ 'slds-size_3-of-12' : (search.type=='CustomField' && metadataObjectOptions != null), 'slds-size_6-of-12' : (search.type!='CustomField' || metadataObjectOptions == null) }">
              <div class="slds-form-element slds-m-left_medium">
                <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_right w275">
                  <svg class="slds-icon slds-input__icon slds-input__icon_right slds-icon-text-default">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#search"></use>
                  </svg>
                  <input type="text" id="ipt-keyword" v-model="search.keyword" v-on:keyup="searchMetadata" class="slds-input input-small" placeholder="Search Component" />
                </div>
              </div><!-- .slds-form-element -->
            </div> 
            <div class="slds-size_2-of-12" v-bind:class="{ 'check-wide-col' : (search.type=='CustomField' && metadataObjectOptions != null) }">
              <div class="slds-wrap slds-text-align_right">
                <span class="slds-checkbox">
                  <input type="checkbox" name="options" id="chk-show-checked" v-bind:checked="search.showChecked" v-on:click="showOnlyChecked" value="1" />
                  <label class="slds-checkbox__label" for="chk-show-checked">
                    <span class="slds-checkbox_faux"></span>
                    <span class="slds-form-element__label mr0">&nbsp;Checked ({{ metaChecked }})</span>
                  </label>
                </span>
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
                  <th scope="col" class="slds-is-sortable" v-bind:class="{'sort-active' : (sortByField=='NAME')}">
                    <a class="slds-th__action slds-text-link_reset slds-text-title_caps" href="javascript:void(0);" v-on:click="handleSort('NAME', !sortByASC)" role="button">
                      <span class="slds-truncate" title="Name">Name</span>
                      <span class="slds-icon_container">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowup" v-if="sortByASC"></use>  
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" v-if="sortByASC==false"></use>  
                        </svg>
                      </span>
                    </a>
                  </th>
                  <th scope="col" class="slds-is-sortable" v-bind:class="{'sort-active' : (sortByField=='OBJECT')}" v-if="OBJECT_TYPES.indexOf(search.type)>=0">
                    <a class="slds-th__action slds-text-link_reset slds-text-title_caps" href="javascript:void(0);" v-on:click="handleSort('OBJECT', !sortByASC)" role="button">
                      <span class="slds-truncate" title="Object/Folder">Object/Folder</span>
                      <span class="slds-icon_container">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowup" v-if="sortByASC"></use>  
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" v-if="sortByASC==false"></use>  
                        </svg>
                      </span>
                    </a>
                  </th>
                  <th scope="col" class="slds-is-sortable" v-bind:class="{'sort-active' : (sortByField=='ENTITY')}" v-if="search.type=='all'">
                    <a class="slds-th__action slds-text-link_reset slds-text-title_caps" href="javascript:void(0);" v-on:click="handleSort('ENTITY', !sortByASC)" role="button">
                      <span class="slds-truncate" title="Entity">Entity Type</span>
                      <span class="slds-icon_container">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowup" v-if="sortByASC"></use>  
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" v-if="sortByASC==false"></use>  
                        </svg>
                      </span>
                    </a>
                  </th>
                  <th scope="col" class="slds-is-sortable" v-bind:class="{'sort-active' : (sortByField=='lastModifiedDate')}" v-if="showModifiedColumn">
                    <a class="slds-th__action slds-text-link_reset slds-text-title_caps" href="javascript:void(0);" v-on:click="handleSort('lastModifiedDate', !sortByASC)" role="button">
                      <span class="slds-truncate" title="lastModifiedDate">LastModifiedDate</span>
                      <span class="slds-icon_container">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowup" v-if="sortByASC"></use>  
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" v-if="sortByASC==false"></use>  
                        </svg>
                      </span>
                    </a>
                  </th>
                  <th scope="col" class="slds-is-sortable" v-bind:class="{'sort-active' : (sortByField=='lastModifiedByName')}" v-if="showModifiedColumn">
                    <a class="slds-th__action slds-text-link_reset slds-text-title_caps" href="javascript:void(0);" v-on:click="handleSort('lastModifiedByName', !sortByASC)" role="button">
                      <span class="slds-truncate" title="lastModifiedByName">lastModifiedByName</span>
                      <span class="slds-icon_container">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowup" v-if="sortByASC"></use>  
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" v-if="sortByASC==false"></use>  
                        </svg>
                      </span>
                    </a>
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
                  <td v-if="OBJECT_TYPES.indexOf(search.type)>=0">
                    <div class="slds-truncate">{{ row.objectLabel || row.folderLabel }}</div>
                  </td>
                  <td v-if="search.type=='all'">
                    <div class="slds-truncate">{{ metadataTypes[row.type] }}</div>
                  </td>
                  <td v-if="showModifiedColumn">
                    <div class="slds-truncate">{{ (row.lastModifiedDate) ? moment(row.lastModifiedDate).format('YYYY/MM/DD HH:mm') : '' }}</div>
                  </td>
                  <td v-if="showModifiedColumn">
                    <div class="slds-truncate">{{ row.lastModifiedByName || '' }}</div>
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