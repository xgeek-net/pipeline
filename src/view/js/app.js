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
    message : null,
    setting : null,
    needUpdate : false,
    newConnection : null,
    connections : [],
    connectionMap : {},
    pipelines : [],
    pipeline : null
  },
  created: function() {
    const self = this;
    self.ipc = ipcRenderer;
  },
  mounted: function () {
    const self = this;
    setTimeout(function(){
      self.reloadConnect({ 
        callback : function() {
          if(self.connections == null || self.connections.length == 0) {
            // Initial page first time
            self.page.title = CONST.titles.connections;
            self.page.menu = 'connections';
            self.page.status = 'mounted';
            self.page.loading = false;
            return;
          }
          self.activeMenu('pipelines', CONST.titles.pipelines);
        } 
      });
    }, 1400);
  },
  methods: {
    activeMenu : function(menu, title) {
      const self = this;
      self.page.title = title;
      self.page.menu = menu;
      if(menu == 'connections') {
        self.reloadConnect();
      }
      if(menu == 'pipelines') {
        self.reloadPipelines({ 
          callback : function() {
            self.page.status = 'mounted';
            self.page.loading = false;
          } 
        });
      }
      if(self.setting == null) {
        self.loadSetting();
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
    showMessage : function(mes) {
      this.message = mes;
    },
    closeMessage : function() {
      this.message = null;
    },
    showNotification : function() {
      this.needUpdate = true;
    },
    hideNotification : function() {
      this.needUpdate = false;
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
    loadSetting : function() {
      const self = this;
      self.request('data-setting', {}, function(err, setting) {
        console.log('>>> setting', setting);
        if(err) self.handleError(err);
        self.setting = setting;
        // Check update
        if(setting.appVersion && setting.appLatestVersion 
          && setting.appVersion != setting.appLatestVersion) {
          self.showNotification();
        }
      });
    },
    /** Reload connection list from local storage */
    reloadConnect : function(opt) {
      opt = opt || {};
      var self = this;
      self.request('data-connections', {}, function(err, result){
        if(err) self.handleError(err);
        self.connections = result;
        self.connectionMap = self.convertMap(result);
        if(opt.callback) opt.callback();
      });
    },
    saveConnect: function(data, callback) {
      const self = this;
      self.modal.loading = true;
      self.request('data-new-connection', {connect : data}, function(err, connections) {
        self.modal.loading = false;
        if(err) {
          self.handleError(err);
          return callback(false);
        }
        self.connections = connections;
        self.connectionMap = self.convertMap(connections);
        //console.log('>>> save result', connections);
        self.closeModal();
      });
    },
    delConnect: function(id, callback) {
      const self = this;
      self.request('data-remove-connection', {id : id}, function(err, result){
        if(err) return self.handleError(err);
        self.reloadConnect();
        if(callback) callback(true);
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
      if(this.$refs.newpipeline) {
        this.$refs.newpipeline.reload();
      }
      this.page.title = 'New Pipeline';
      this.page.menu = 'newpipeline';
    },
    runPipeline : function(id, callback) {
      //console.log('>>>>run pipeline', id);
      var self = this;
      self.request('pipeline-run', {id : id}, function(err, result){
        //console.log('>>>pipeline-run', err, result);
        // Will fire multiple time
        if(err) self.handleError(err);
        if(result && result.type != 'process') {
          // Remove Listener
          self.ipc.removeListener('pipeline-run-callback', function(){});
        }
        self.reloadPipelines({ callback : callback });
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
    editPipeline : function(id) {
      const self = this;
      self.newPipeline();
      this.page.title = 'Edit Pipeline';
      self.pipeline = self.getPipeline(id);
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
      if(self.$refs.pipelinedetail) {
        self.$refs.pipelinedetail.$destroy();
      }
    },
    convertMap : function(records) {
      if(!records) return {};
      let recMap = {};
      for(let record of records) {
        recMap[record.id] = record;
      }
      return recMap;
    },
    handleError : function(err) {
      const self = this;
      let message = (typeof err == 'string') ? err : err.message;
      if(message && message.length > 0) {
        self.showMessage({ type : err.type || 'error', message : message });
        setTimeout(function(){ self.closeMessage(); }, 5000);
      }
    }
  }
});