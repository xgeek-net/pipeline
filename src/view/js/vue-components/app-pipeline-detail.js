Vue.component('pipeline-detail', {
  props: ['pipeline'],
  data : function () {
    return {
      refPipeline : null,
      refIntervalId : null,
      body : '',
      request : 0
    }
  },
  created: function () {
    const self = this;
    self.refPipeline = self.pipeline;
    //console.log('>>>> loadBody created', (new Date()));
    this.loadBody();
  },
  updated: function () {
    const self = this;
    if(self.refPipeline.id != self.pipeline.id) {
      //console.log('>>>> loadBody updated', (new Date()));
      this.loadBody();
    }
    if(self.body.length > 0) {
      // Scroll to bottom
      var bodyEle = document.getElementById('pipeline-detail-body');
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
      if(self.refIntervalId) {
        clearInterval(self.refIntervalId);
        self.refIntervalId = null;
      }
      app.closePipelineDetail();
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
    requestPipelineLog : function() {
      const self = this;
      //console.log('>>>> loadBody request ' + self.pipeline.id, self.pipeline.completed_at, self.refIntervalId, (new Date()));
      app.request('data-pipeline-log', {id : self.pipeline.id}, function(err, result){
        if(err) app.handleError(err);
        //console.log('>>>> loadBody Callback', self.pipeline.id, (new Date()));
        result = result || '';
        result = result.replace(/ /g, '&nbsp;').replace(/\r?\n/g, '<br />');
        const regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
        const regexp_makeLink = function(all, url, h, href) {
          return '<a href="h' + href + '" target="_blank">' + url + '</a>';
        }
        self.body = result.replace(regexp_url, regexp_makeLink);
        if(self.pipeline.completed_at && self.pipeline.completed_at.length > 0 && 
          self.refIntervalId) {
          // Cancel loop if completed
          clearInterval(self.refIntervalId);
          self.refIntervalId = null;
        }
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
      <div class="detail-body slds-size_2-of-2" id="pipeline-detail-body">
        <p v-html="body"></p>
      </div><!-- .detail-body -->
    </article>
  `
})