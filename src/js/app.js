var app = new Vue({
  el: '#app',
  data: {
    menu : 'connections',
    pageHeader: 'CONNECTIONS',
    status : 'processing',
    loading : true,
    connections : [
      { type : 'Github', name : 'Sysdev01', username : 'adam@company.com.sysdev01', status : 'Actived'},
      { type : 'Sandbox', name : 'Delivery', username : 'adam@company.com.delivery', status : 'Actived'}
    ],
    pipelines : [
      { name : 'ReleasePack_0605', started : '15 hours ago', duration : '2 min 22 sec', status : 'Successful'},
      { name : 'ReleasePack_0607', started : '12 hours ago', duration : '2 min 22 sec', status : 'Pending'},
      { name : 'ReleasePack_0606', started : '12 hours ago', duration : '2 min 22 sec', status : 'Failed'}
    ]
  },
  mounted: function () {
    var self = this;
    setTimeout(function(){
      self.activeMenu('connections', 'CONNECTIONS');
    }, 2500);
  },
  methods: {
    activeMenu : function(menu, title) {
      this.pageHeader = title;
      this.menu = menu;
      this.loading = false;
      this.status = 'mounted';
    },
    newPipeline: function (ev) {
      this.pageHeader = 'New Pipeline';
      this.menu = 'newpipeline';
    }
  }
});