const {ipcRenderer} = require('electron');
var app = new Vue({
  el: '#app',
  data: {
    ipc : null,
    page : {  // App state
      status : 'processing',  
      menu : '', title : ''
    },
    modal : { show : false, loading : false, title : '', data : null },
    newConnection : null,
    connections : [],
    pipelines : [
      { name : 'ReleasePack_0605', started : '15 hours ago', duration : '2 min 22 sec', status : 'Successful'},
      { name : 'ReleasePack_0607', started : '12 hours ago', duration : '2 min 22 sec', status : 'Pending'},
      { name : 'ReleasePack_0606', started : '12 hours ago', duration : '2 min 22 sec', status : 'Failed'}
    ]
  },
  created: function() {
    var self = this;
    self.ipc = ipcRenderer;
  },
  mounted: function () {
    var self = this;
    self.request('data-connections', {}, function(err, result){
      if(err) self._handleError(err);
      self.connections = result;
      self.activeMenu('connections', CONST.titles.connections);
    });
    /*self.ipc.send('data-connections', {a: 10000});
    self.ipc.on('data-connections-callback', (ev, result) => {
      self.connections = result;
      self.activeMenu('connections', CONST.titles.connections);
    });*/
  },
  methods: {
    activeMenu : function(menu, title) {
      this.page.title = title;
      this.page.menu = menu;
      this.page.status = 'mounted';
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
      let self = this;
      self.ipc.send(apiName, params);
      self.ipc.on(apiName + '-callback', (ev, err, result) => {
        callback(err, result);
      });
    },
    saveConnect: function(data) {
      let self = this;
      self.modal.loading = true;
      self.request('data-new-connection', {connect : data}, function(err, connections) {
        if(err) self._handleError(err);
        self.connections = connections;
        console.log('>>> save result', connections);
        self.closeModal();
      });
    },
    delConnect: function(data) {
      let self = this;
      self.modal.loading = true;
      self.request('data-new-connection', {connect : data}, function(err, connections) {
        if(err) self._handleError(err);
        self.connections = connections;
        console.log('>>> save result', connections);
        self.closeModal();
      });
    },
    newPipeline: function (ev) {
      this.page.title = 'New Pipeline';
      this.page.menu = 'newpipeline';
    },

    _handleError : function(err) {

    }
  }
});