Vue.component('app-sidebar', {
  props: ['menu'],
  methods: {
    newPipeline: function (ev) {
      app.newPipeline(ev);
    },
    openConnections: function (ev) {
      if(app.connection) {
        app.connection = null;
      }
      app.activeMenu('connections', 'CONNECTIONS');
    },
    openPipelines: function (ev) {
      if(app.pipeline) {
        app.pipeline = null;
      }
      app.activeMenu('pipelines', 'PIPELINES');
    }
  },
  template: `
    <div id="sidebar">
      <ul class="sidebar-body">
        <li class="menu">
          <a href="javascript:void(0);" v-on:click="newPipeline" class="menu-button button-round">
            <span class="slds-icon_container slds-icon-utility-add slds-m-around_x-small">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#add"></use>
              </svg>
            </span>
          </a>
        </li>
        <li class="hr heading"></li>
        <li class="menu">
          <a href="javascript:void(0);" v-on:click="openConnections"  class="menu-button button-bound" v-bind:class="{active:(menu=='connections')}">
            <span class="slds-icon_container slds-icon-utility-salesforce1 slds-m-around_x-small">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
              </svg>
            </span>
          </a>
        </li>
        <li class="menu">
          <a href="javascript:void(0);" v-on:click="openPipelines"  class="menu-button button-bound" v-bind:class="{active:(menu=='pipelines')}">
            <span class="slds-icon_container slds-icon-utility-feed slds-m-around_x-small">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#feed"></use>
              </svg>
            </span>
          </a>
        </li>
        <li class="menu fix-bottom">
          <a class="github-button" href="https://github.com/xgeek-net/pipeline" target="_blank"><i class="fab fa-github"></i></a>
        </li>
      </ul><!-- .sidebar-body -->
    </div><!-- #sidebar -->
  `
})