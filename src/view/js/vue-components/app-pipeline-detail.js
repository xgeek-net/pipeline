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
    this.loadBody();
  },
  updated: function () {
    if(self.refPipeline.id != self.pipeline.id) {
      this.loadBody();
    }
  },
  methods: {
    closeDetail : function(ev) {
      app.closePipelineDetail();
    },
    loadBody : function() {
      const self = this;
      if(self.refIntervalId) {
        console.log('>>>> clearInterval ', self.refIntervalId);
        clearInterval(self.refIntervalId);
      }
      if(!self.pipeline.completed_at || self.pipeline.completed_at == '') {
        // Processing
        self.refIntervalId = setInterval(function() {
          self.requestPipelineLog();
        }, 3000);
      }
      console.log('>>>> loadBody updated', (new Date()));
      this.request = 0;
    },
    requestPipelineLog : function() {
      app.request('data-pipeline-log', {id : self.pipeline.id}, function(err, result){
        if(err) app.handleError(err);
        console.log('>>>> loadBody Callback', self.pipeline.id, (new Date()));
        result = result || '';
        self.body = result.replace(/ /g, '&nbsp;').replace(/\r?\n/g, '<br />');
        self.request--;
        // Loop each 2s
        if(!self.pipeline.completed_at || self.pipeline.completed_at == '') {
          
        }
      });
    }
  },
  template: `
    <article class="pipeline-detail">
      <div class="detail-header slds-size_2-of-2">
        <h2>{{ pipeline.name }}
          <p class="status">
            <span class="duration">{{ pipeline.duration || ' ' }}</span>
            <i class="fas" v-bind:class="{ 'fa-check-circle': pipeline.status=='successful', 'fa-spinner fa-spin': (pipeline.status=='pending' || pipeline.status=='processing'), 'fa-exclamation-circle': pipeline.status=='failed' }"></i>
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
      <div class="detail-body slds-size_2-of-2">
        <p v-html="body"></p>
      </div><!-- .detail-body -->
    </article>
  `
})