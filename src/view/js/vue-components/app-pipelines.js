Vue.component('app-pipelines', {
  props: ['pipelines', 'detail'],
  methods: {
    openDetail : function(pid) {
      app.openPipelineDetail(pid);
    },
    rerunPipeline : function(pid, ev) {
      app.runPipeline(pid);
    },
    clonePipeline : function(pid, ev) {
      
    }
  },
  template: `
    <article class="slds-card" v-bind:class="{ 'only-show-main': detail!=null}">
      <div class="slds-card__header slds-grid">
        <header class="slds-media slds-media_center slds-has-flexi-truncate">
          <div class="slds-media__figure">
            <span class="slds-icon_container slds-icon-standard-feed" title="contact">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="components/salesforce-lightning-design-system/assets/icons/standard-sprite/svg/symbols.svg#feed"></use>
              </svg>
            </span>
          </div>
          <div class="slds-media__body">
            <h2 class="slds-card__header-title">
              <a href="javascript:void(0);" class="slds-card__header-link slds-truncate">
                <span class="slds-text-heading_small">Pipelines ({{ (pipelines) ? pipelines.length : '0' }})</span>
              </a>
            </h2>
          </div>
          <div class="slds-no-flex sub-col">
            <button class="slds-button slds-button_neutral">New</button>
          </div>
        </header>
      </div>
      <div class="slds-card__body">
        <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer app-table">
          <thead>
            <tr class="slds-text-title_caps">
              <th scope="col" class="main-col" style="width: 3.25rem;">
                <div class="slds-truncate" title="NO">#</div>
              </th>
              <th scope="col" class="main-col">
                <div class="slds-truncate" title="Type">Pipeline</div>
              </th>
              <th scope="col" class="sub-col">
                <div class="slds-truncate" title="Name">Status</div>
              </th>
              <th scope="col" class="sub-col">
                <div class="slds-truncate" title="Username">Started</div>
              </th>
              <th scope="col" class="sub-col">
                <div class="slds-truncate" title="Status">Duration</div>
              </th>
              <th scope="col" class="sub-col" style="width: 6.75rem;">
                <div class="slds-truncate" title="Status">Actions</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="slds-hint-parent" v-bind:class="{ 'slds-is-selected': (detail!=null && detail.id==row.id)}" v-for="(row, index) in pipelines" v-if="pipelines!=null">
              <th scope="row" class="main-col">
                <div class="slds-truncate">{{ index+1 }}</div>
              </th>
              <td class="main-col">
                <div class="slds-truncate">
                  <a v-on:click="openDetail(row.id)">{{ row.name }}</a>
                </div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate pipeline-status" v-bind:class="{ 'success': row.status=='successful', 'warning': (row.status=='pending' || row.status=='processing'), 'error': row.status=='failed' }">
                  <i class="fas" v-bind:class="{ 'fa-check-circle': row.status=='successful', 'fa-spinner fa-spin': (row.status=='pending' || row.status=='processing'), 'fa-exclamation-circle': row.status=='failed' }"></i>
                  {{ row.status }}
                </div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">{{ (row.started_at) ? moment(row.started_at).format('YYYY/MM/DD HH:mm:ss') : '' }}</div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">{{ row.duration || '' }}</div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="rerunPipeline(row.id, $event)">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#redo"></use>
                    </svg>
                  </button>
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="clonePipeline(row.id, $event)">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#layers"></use>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `
})