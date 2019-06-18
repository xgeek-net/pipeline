Vue.component('pipeline-detail', {
  props: ['pipeline'],
  data : function () {
    return {
      loading : true,
      refPipeline : null,
      refIntervalId : null,
      refDeployComponents : null,
      runTestFailures : null,
      deployResult : null,
      body : '',
      request : 0,
      logCollapsed : true,
      componentCircle : null,
      testclassCircle : null,
      showedTabName : 'component'
    }
  },
  created: function () {
    const self = this;
    self.refPipeline = self.pipeline;
    //console.log('>>>> loadBody created', (new Date()));
    this.loadBody();
  },
  mounted: function() {
    // Set circle progress
    if(!this.componentCircle && !this.testclassCircle) {
      this.initCircle();
    }
  },
  updated: function () {
    const self = this;
    if(self.refPipeline.id != self.pipeline.id) {
      //console.log('>>>> loadBody updated', (new Date()));
      this.loadBody();
    }
    if(self.body.length > 0) {
      // Scroll to bottom
      var bodyEle = document.getElementById('pipeline-log-body');
      bodyEle.scrollTop = bodyEle.scrollHeight;
    }
  },
  destroyed: function () {
    const self = this;
    if(self.refIntervalId) {
      //console.log('>>>> clearInterval destroyed ', self.refIntervalId);
      clearInterval(self.refIntervalId);
      self.refIntervalId = null;
    }
  },
  methods: {
    reload : function() {
      this.refPipeline = null;
      this.refIntervalId = null;
      this.body = '';
      this.request = 0;
    },
    closeDetail : function(ev) {
      const self = this;
      if(self.refIntervalId) {
        clearInterval(self.refIntervalId);
        self.refIntervalId = null;
      }
      app.closePipelineDetail();
    },
    collapseLog : function(ev) {
      const self = this;
      self.logCollapsed = !self.logCollapsed;
    },
    openTab : function(tabName) {
      this.showedTabName = tabName;
    },
    // @see https://progressbarjs.readthedocs.io/en/latest/api/shape/#setprogress
    initCircle : function() {
      const self = this;
      self.componentCircle = new ProgressBar.Circle('#component-circle', self.getProgressStyle('success'));
      self.testclassCircle = new ProgressBar.Circle('#testclass-circle', self.getProgressStyle());
    },
    /** Option for ProgressBar */
    getProgressStyle : function(type) {
      let opt = {
        color: '#cccccc',
        strokeWidth : 15,
        trailColor: '#cccccc',
        text: {
          value: '',
          className: 'progressbar__label'
        }
      };
      if(type == 'success') opt.color = '#04844b';
      if(type == 'error') opt.color = '#c23934';
      return opt;
    },
    getProgressText : function(numTotal, numErrors, numCompleted) {
      if(typeof numTotal == 'undefined') return '';
      if(numTotal === 0) {
        return 'Not Required';
      }
      let progText = (numCompleted + numErrors) + '/' + numTotal;
      if(numErrors > 1) {
        progText += '<br />' + numErrors + ' Errors';
      } else if(numErrors > 0) {
        progText += '<br />' + numErrors + ' Error';
      }
      return progText;
    }, 
    loadBody : function() {
      const self = this;
      if(self.refIntervalId) {
        //console.log('>>>> clearInterval loadBody ', self.refIntervalId);
        clearInterval(self.refIntervalId);
        self.refIntervalId = null;
      }
      if(!self.pipeline.completed_at || self.pipeline.completed_at == '') {
        // Processing, Loop each 2s
        self.refIntervalId = setInterval(function() {
          self.requestPipelineLog();
        }, 2000);
      } else {
        // Completed pipeline
        self.requestPipelineLog();
      }
    },
    // Show process circle chart for deploy result
    loadDeployResult : function() {
      const self = this;
      if(!self.deployResult) {
        self.refDeployComponents = null;
        self.runTestFailures = null;
        if(self.testclassCircle) self.testclassCircle.destroy();
        if(self.componentCircle) self.componentCircle.destroy();
        self.initCircle();
        return;
      }
      
      // Array or null
      self.runTestFailures = (self.deployResult.details && self.deployResult.details.runTestResult  && self.deployResult.details.runTestResult.failures)
                             ? self.deployResult.details.runTestResult.failures : null;
      if(self.runTestFailures) self.runTestFailures = (Array.isArray(self.runTestFailures)) ? self.runTestFailures : [self.runTestFailures];

      // Sort by contentType
      const pushComponents = function(targets) {
        if(!targets) return;
        if(!Array.isArray(targets)) targets = [targets];
        for(let cmp of targets) {
          if(!cmp.componentType || cmp.componentType.length == 0) continue;
          if(!components.hasOwnProperty(cmp.componentType)) {
            components[cmp.componentType] = [];
          }
          components[cmp.componentType].push(cmp);
        }
      }
      let components = {};
      const deployResult = self.deployResult;
      if(deployResult.details) {
        pushComponents(deployResult.details.componentSuccesses);
        pushComponents(deployResult.details.componentFailures);
      }
      // Output component table
      self.refDeployComponents = [];
      for(let cmpType in components) {
        for(let cmp of components[cmpType]) {
          self.refDeployComponents.push(cmp);
        }
      }
      // Set Component Circle
      if(deployResult.numberComponentsTotal > 0) {
        // Change success to error color
        if(deployResult.numberComponentErrors > 0 && self.componentCircle._opts.color !== '#c23934') {
          self.componentCircle.destroy();
          self.componentCircle = new ProgressBar.Circle('#component-circle', self.getProgressStyle('error'));
        }
        const per = Math.floor(((deployResult.numberComponentsDeployed + deployResult.numberComponentErrors) / deployResult.numberComponentsTotal) * 100) / 100;
        self.componentCircle.set(per);
        let numTxt = self.getProgressText(deployResult.numberComponentsTotal, deployResult.numberComponentErrors, deployResult.numberComponentsDeployed);
        self.componentCircle.setText(numTxt);
      }
      // Set Testclass Circle
      if(deployResult.numberTestsTotal > 0) {
        // Change to success color
        if(deployResult.numberTestErrors > 0 && self.testclassCircle._opts.color !== '#04844b') {
          self.testclassCircle.destroy();
          self.testclassCircle = new ProgressBar.Circle('#testclass-circle', self.getProgressStyle('success'));
        }
        // Change to error color
        if(deployResult.numberTestErrors > 0 && self.testclassCircle._opts.color !== '#c23934') {
          self.testclassCircle.destroy();
          self.testclassCircle = new ProgressBar.Circle('#testclass-circle', self.getProgressStyle('error'));
        }
        const per = Math.floor(((deployResult.numberTestsCompleted + deployResult.numberTestErrors) / deployResult.numberTestsTotal) * 100) / 100;
        self.testclassCircle.set(per);
      }
      let numTestTxt = self.getProgressText(deployResult.numberTestsTotal, deployResult.numberTestErrors, deployResult.numberTestsCompleted);
      self.testclassCircle.setText(numTestTxt);
    },
    requestPipelineLog : function() {
      const self = this;
      //console.log('>>>> loadBody request ' + self.pipeline.id, self.pipeline.completed_at, self.refIntervalId, (new Date()));
      app.request('data-pipeline-log', {id : self.pipeline.id}, function(err, result){
        if(err) app.handleError(err);
        //console.log('>>>> loadBody Callback', self.pipeline.id, result);
        result = result || {};
        self.deployResult = (result.deployResult && result.deployResult.id) ? result.deployResult : null;
        self.loadDeployResult();

        let logBody = result.body || '';
        logBody = logBody.replace(/ /g, '&nbsp;').replace(/\r?\n/g, '<br />');
        const regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
        const regexp_makeLink = function(all, url, h, href) {
          return '<a href="h' + href + '" target="_blank">' + url + '</a>';
        }
        self.body = logBody.replace(regexp_url, regexp_makeLink);

        self.refPipeline = self.pipeline;
        if(self.refPipeline.completed_at && self.refPipeline.completed_at.length > 0) {
          self.loading = false;
          // Cancel loop if completed
          if(self.refIntervalId) {
            clearInterval(self.refIntervalId);
            self.refIntervalId = null;
          }
        }
        
      });
    },
    // Export metadata zip file
    exportMetadata : function() {
      const self = this;
      // @see https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
      const b64toBlob = function(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;
        var byteCharacters = atob(b64Data);
        var byteArrays = [];
        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          var slice = byteCharacters.slice(offset, offset + sliceSize);
          var byteNumbers = new Array(slice.length);
          for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          var byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
      }
      app.request('data-pipeline-export-metadata', {id : self.pipeline.id}, function(err, result){
        if(err) app.handleError(err);
        const content = b64toBlob(result.data, 'application/zip');
        let link = document.createElement('A');
        link.href = window.URL.createObjectURL(content);
        link.download = self.pipeline.name + '.zip';;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  },
  template: `
    <article class="pipeline-detail">
      <div class="detail-header slds-size_2-of-2">
        <h2>{{ pipeline.name }}
          <p class="status">
            <span class="duration">&nbsp;{{ pipeline.duration || '' }}</span>
            <span class="pipeline-status" v-bind:class="{ 'success': pipeline.status=='successful', 'error': pipeline.status=='failed' }">
              <i v-bind:class="{ 'far fa-pause-circle': pipeline.status=='ready', 
                            'fas fa-spinner fa-spin': (pipeline.status=='processing'), 
                            'fas fa-check-circle': pipeline.status=='successful', 
                            'fas fa-exclamation-circle': pipeline.status=='failed' }"></i>
            </span>
          </p>
        </h2>
        <div class="detail-buttons">
          <button class="slds-button slds-button_icon slds-button_icon-inverse" title="Close" v-on:click="closeDetail">
            <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
              <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
            </svg>
          </button>
        </div>
      </div><!-- .detail-header -->
      <div class="detail-body slds-size_2-of-2" v-bind:class="{ 'slds-hide': !logCollapsed}" id="pipeline-detail-body">
        <div role="status" class="slds-spinner slds-spinner_medium slds-spinner_brand" v-if="loading">
          <span class="slds-assistive-text">Loading</span>
          <div class="slds-spinner__dot-a"></div>
          <div class="slds-spinner__dot-b"></div>
        </div><!-- .slds-spinner -->
        <article class="slds-card detail-process-panel">
          <div class="slds-card__body slds-grid">
            <div class="slds-size_1-of-3 process-detail">
              <ul>
                <li><label>Name: </label>
                  <a v-bind:href="deployResult.url" v-if="deployResult && deployResult.url" target="_blank">{{ deployResult.id }}</a>
                </li>
                <li><label>Status: </label>
                  <span class="success" v-if="refPipeline.status == 'successful'">Successed</span>
                  <span class="error" v-if="refPipeline.status == 'failed'">Failed</span>
                  <span class="" v-if="refPipeline.status != 'successful' && refPipeline.status != 'failed' ">Processing</span>
                </li>
                <li><label>Deployed By: </label>
                  <a v-bind:href="deployResult.instanceUrl + '/' + deployResult.createdBy" v-if="deployResult && deployResult.createdBy" target="_blank">{{ deployResult.createdByName }}</a>
                </li>
                <li><label>Start Time: </label>{{ (refPipeline.started_at) ? moment(refPipeline.started_at).format('YYYY/MM/DD HH:mm') : '' }}</li>
                <li><label>End Time:  </label>{{ (refPipeline.completed_at) ? moment(refPipeline.completed_at).format('YYYY/MM/DD HH:mm') : '' }}</li>
                <li v-if="deployResult && deployResult.id">
                  <button class="slds-button slds-button_neutral btn-export-metadata" v-on:click="exportMetadata">
                    <svg class="slds-button__icon slds-button__icon_left" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#download"></use>
                    </svg>
                    Metadata</button>
                </li>
              </ul>
            </div>
            <div class="slds-size_1-of-3 component-progress">
              <div class="circle" id="component-circle"></div>
              <h3 class="title">Components</h3>
            </div>
            <div class="slds-size_1-of-3 testclass-progress">
              <div class="circle" id="testclass-circle"></div>
              <h3 class="title">Apex Tests</h3>
            </div>
          </div>
        </article>

        
      <div class="slds-tabs_default slds-tabs_card detail-tabs">
        <ul class="slds-tabs_default__nav" role="tablist">
          <li class="slds-tabs_default__item"  v-bind:class="{ 'slds-is-active': showedTabName=='component'}">
            <a class="slds-tabs_default__link" v-on:click="openTab('component')">Components <span v-if="deployResult && deployResult.numberComponentsTotal"> ({{ deployResult.numberComponentsTotal }})</span></a>
          </li>
          <li class="slds-tabs_default__item"  v-bind:class="{ 'slds-is-active': showedTabName=='testclass'}" v-if="deployResult && deployResult.numberTestsTotal">
            <a class="slds-tabs_default__link" v-on:click="openTab('testclass')">Apex Test Failures <span v-if="deployResult && deployResult.numberTestErrors"> ({{ deployResult.numberTestErrors }})</span></a>
          </li>
        </ul>
        <div class="slds-tabs_default__content" v-bind:class="{ 'slds-show': showedTabName=='component', 'slds-hide': showedTabName!='component'}">
          <article class="slds-card detail-component-panel">
            <div class="slds-card__body">
              <table class="slds-table slds-table_bordered slds-no-row-hover slds-table_cell-buffer">
                <thead>
                  <tr class="slds-line-height_reset">
                    <th scope="col" style="width: 3.25rem;">
                      <div class="slds-truncate" title="NO">#</div>
                    </th>
                    <th scope="col">
                      <div class="slds-truncate" title="Name">Name</div>
                    </th>
                    <!-- 
                    TODO show Label
                    <th scope="col">
                      <div class="slds-truncate" title="Object/Folder">Object/Folder</div>
                    </th> -->
                    <th scope="col">
                      <div class="slds-truncate" title="Username">Entity Type</div>
                    </th>
                    <th scope="col">
                      <div class="slds-truncate" title="Status">Status</div>
                    </th>
                  </tr>
                </thead>
                <tbody v-if="deployResult && refDeployComponents">
                  <tr class="slds-line-height_reset" v-for="(row, index) in refDeployComponents">
                    <th scope="row">
                      <div class="slds-truncate">{{ index+1 }}</div>
                    </th>
                    <td>
                      <div class="slds-truncate">
                        <a v-bind:href="deployResult.instanceUrl + '/' + row.id" target="_blank" v-if="row.id && deployResult">{{ row.fullName }}</a>
                        <span v-if="!row.id && deployResult">{{ row.fullName }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="slds-truncate">{{ row.componentTypeLabel || row.componentType }}</div>
                    </td>
                    <td>
                      <div class="slds-truncate success" v-if="row.success=='true'">
                        <i class="fas fa-check-circle" />&nbsp;
                        <span>{{ row.status }}</span>
                      </div>
                      <div class="slds-truncate error" v-if="row.success=='false'">
                        <i class="fas fa-minus-circle" />&nbsp;
                        <span class="detail">{{ row.problem || 'Error' }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div><!-- .slds-tabs_default__content -->

        <div class="slds-tabs_default__content" v-bind:class="{ 'slds-show': showedTabName=='testclass', 'slds-hide': showedTabName!='testclass'}">
          <article class="slds-card detail-component-panel">
            <div class="slds-card__body">
              <table class="slds-table slds-table_bordered slds-no-row-hover slds-table_cell-buffer">
                <thead>
                  <tr class="slds-line-height_reset">
                    <th scope="col" style="width: 3.25rem;">
                      <div class="slds-truncate" title="NO">#</div>
                    </th>
                    <th scope="col">
                      <div class="slds-truncate" title="Class Name">Class</div>
                    </th>
                    <th scope="col">
                      <div class="slds-truncate" title="Error Message">Error Message</div>
                    </th>
                  </tr>
                </thead>
                <tbody v-if="deployResult && runTestFailures">
                  <tr class="slds-line-height_reset" v-for="(row, index) in runTestFailures">
                    <th scope="row">
                      <div class="slds-truncate">{{ index+1 }}</div>
                    </th>
                    <td>
                      <div class="slds-truncate">
                        <a v-bind:href="deployResult.instanceUrl + '/' + row.id" target="_blank" v-if="row.id && deployResult">{{ row.name }}</a>
                        <span v-if="!row.id && deployResult">{{ row.name }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="slds-truncate error">
                        <i class="fas fa-minus-circle" />&nbsp;
                        <span class="detail">{{ row.message || 'Error' }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div><!-- .slds-tabs_default__content -->
      </div><!-- .slds-tabs_card -->

      </div>
      <div class="pipeline-log slds-size_2-of-2" v-bind:class="{ 'collapsed': logCollapsed}">
        <button class="slds-button slds-button_icon slds-button_icon-inverse btn-collapse" title="Collapse" v-on:click="collapseLog">
          <svg class="slds-button__icon slds-button__icon_medium" aria-hidden="true" v-if="logCollapsed">
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#jump_to_top"></use>
          </svg>
          <svg class="slds-button__icon slds-button__icon_medium" aria-hidden="true" v-if="logCollapsed==false">
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#jump_to_bottom"></use>
          </svg>
        </button>
        <p v-html="body" id="pipeline-log-body"></p>
      </div><!-- .detail-body -->
    </article>
  `
})