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
    request : function(apiName, params, callback, opts) {
      const self = this;
      opts = opts || {};
      if(opts.once === false) {
        self.ipc.send(apiName, params);
        self.ipc.on(apiName + '-callback', function(ev, err, result) {
          callback(err, result);
        });
      } else {
        return self.requestOnce(apiName, params, callback);
      }
    },
    requestOnce : function(apiName, params, callback) {
      const self = this;
      self.ipc.send(apiName, params);
      self.ipc.once(apiName + '-callback', function(ev, err, result) {
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
    /**
     * Reload pipeline list from local storage
     * @param {Object} opts - { callback : function }
     */
    reloadPipelines: function (opts) {
      opts = opts || {};
      const self = this;
      self.request('data-pipelines', {}, function(err, result){
        if(err) self.handleError(err);
        //console.log('>>>>data-pipelines', result);
        self.pipelines = result;
        if(self.pipeline) {
          //console.log('>>>>reload pipeline', self.pipeline.id);
          self.pipeline = self.getPipeline(self.pipeline.id);
        }
        if(opts.callback) opts.callback();
      });
    },
    // Open new pipeline page
    newPipeline: function (ev) {
      this.page.title = 'New Pipeline';
      this.page.menu = 'newpipeline';
    },
    runPipeline : function(id, callback) {
      //console.log('>>>>run pipeline', id);
      var self = this;
      self.request('pipeline-run', {id : id}, function(err, result){
        // Will fire multiple time
        if(err) self.handleError(err);
        self.reloadPipelines();
        if(result.type != 'process') {
          // Remove Listener
          self.ipc.removeListener('pipeline-run-callback', function(){});
        }
        if(callback) callback(true);
      },
      { once : false });
    },
    getPipeline : function(id){
      const self = this;
      for(let pipe of self.pipelines) {
        if(id === pipe.id) {
          return pipe;
        }
      }
    },
    clonePipeline : function(id, callback) {
      const self = this;
      self.request('data-clone-pipeline', {id : id}, function(err, result){
        if(err) return self.handleError(err);
        self.reloadPipelines();
        if(callback) callback(true);
      });
    },
    removePipeline : function(id, callback) {
      const self = this;
      self.request('data-remove-pipeline', {id : id}, function(err, result){
        if(err) return self.handleError(err);
        self.reloadPipelines();
        if(callback) callback(true);
      });
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