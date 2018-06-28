const {ipcRenderer} = require('electron');
var app = new Vue({
  el: '#app',
  data: {
    ipc : null,
    page : {  // App state
      status : 'processing',  
      menu : '', title : '', loading : false
    },
    modal : { show : false, loading : false, title : '', data : null },
    newConnection : null,
    connections : [],
    pipelines : [],
    pipeline : null
  },
  created: function() {
    var self = this;
    self.ipc = ipcRenderer;
  },
  mounted: function () {
    this.activeMenu('connections', CONST.titles.connections);
  },
  methods: {
    activeMenu : function(menu, title) {
      this.page.title = title;
      this.page.menu = menu;
      this.page.status = 'mounted';
      this.page.loading = false;
      if(menu == 'connections') {
        this.reloadConnect();
      }
      if(menu == 'pipelines') {
        this.reloadPipelines();
      }
    },
    showLoading : function(opt) {
      this.page.loading = true;
    },
    hideLoading : function(opt) {
      this.page.loading = false;
    },
    showModal : function(opt) {
      opt = opt || {};
      let loading = (opt.loading == false) ? false : true;
      this.modal = { 
        show : true, 
        loading : loading, 
        title : opt.title || '', 
        data : opt.data || null
      };
    },
    closeModal : function() {
      this.modal = {show : false, loading : false};
    },
    request : function(apiName, params, callback) {
      const self = this;
      self.ipc.send(apiName, params);
      self.ipc.on(apiName + '-callback', (ev, err, result) => {
        callback(err, result);
      });
    },
    /** Reload connection list from local storage */
    reloadConnect : function(opt) {
      opt = opt || {};
      var self = this;
      self.request('data-connections', {}, function(err, result){
        if(err) self.handleError(err);
        self.connections = result;
        if(opt.callback) opt.callback();
      });
    },
    saveConnect: function(data) {
      const self = this;
      self.modal.loading = true;
      self.request('data-new-connection', {connect : data}, function(err, connections) {
        if(err) self.handleError(err);
        self.connections = connections;
        //console.log('>>> save result', connections);
        self.closeModal();
      });
    },
    delConnect: function(data) {
      const self = this;
      self.modal.loading = true;
      self.request('data-new-connection', {connect : data}, function(err, connections) {
        if(err) self.handleError(err);
        self.connections = connections;
        //console.log('>>> save result', connections);
        self.closeModal();
      });
    },
    /** Reload pipeline list from local storage */
    reloadPipelines: function (opt) {
      opt = opt || {};
      const self = this;
      self.request('data-pipelines', {}, function(err, result){
        if(err) self.handleError(err);
        console.log('>>>>data-pipelines', result);
        self.pipelines = result;
      });
    },
    // Open new pipeline page
    newPipeline: function (ev) {
      this.page.title = 'New Pipeline';
      this.page.menu = 'newpipeline';
    },
    runPipeline : function(id) {
      console.log('>>>>run pipeline', id);
      var self = this;
      self.request('pipeline-run', {id : id}, function(err, result){
        if(err) self.handleError(err);
        self.reloadPipelines();
      });
    },
    getPipeline : function(id){
      const self = this;
      for(let pipe of self.pipelines) {
        if(id === pipe.id) {
          return pipe;
        }
      }
    },
    openPipelineDetail : function(id) {
      const self = this;
      self.pipeline = self.getPipeline(id);
    },
    closePipelineDetail : function(id) {
      const self = this;
      self.pipeline = null;
    },
    handleError : function(err) {
      // TODO alert error
    }
  }
});