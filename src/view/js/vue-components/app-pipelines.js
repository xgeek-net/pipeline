Vue.component('app-pipelines', {
  props: ['pipelines'],
  methods: {
    
  },
  template: `
    <article class="slds-card">
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
                <span class="slds-text-heading_small">Pipelines ({{ pipelines.length }})</span>
              </a>
            </h2>
          </div>
          <div class="slds-no-flex">
            <button class="slds-button slds-button_neutral">New</button>
          </div>
        </header>
      </div>
      <div class="slds-card__body">
        <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer app-table">
          <thead>
            <tr class="slds-text-title_caps">
              <th scope="col" style="width: 3.25rem;">
                <div class="slds-truncate" title="NO">#</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Type">Pipeline</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Name">Status</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Username">Started</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Status">Duration</div>
              </th>
              <th scope="col" style="width: 6.75rem;">
                <div class="slds-truncate" title="Status">Actions</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="slds-hint-parent" v-for="(row, index) in pipelines">
              <th scope="row">
                <div class="slds-truncate">{{ index+1 }}</div>
              </th>
              <td>
                <div class="slds-truncate">
                  <a href="javascript:void(0);">{{ row.name }}</a>
                </div>
              </td>
              <td>
                <div class="slds-truncate pipeline-status" v-bind:class="{ 'success': row.status.toLowerCase()=='successful', 'warning': row.status.toLowerCase()=='pending', 'error': row.status.toLowerCase()=='failed' }">
                  <i class="fas" v-bind:class="{ 'fa-check-circle': row.status.toLowerCase()=='successful', 'fa-spinner fa-spin': row.status.toLowerCase()=='pending', 'fa-exclamation-circle': row.status.toLowerCase()=='failed' }"></i>
                  {{ row.status }}
                </div>
              </td>
              <td>
                <div class="slds-truncate">{{ row.started }}</div>
              </td>
              <td>
                <div class="slds-truncate">{{ row.duration }}</div>
              </td>
              <td>
                <div class="slds-truncate">
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#redo"></use>
                    </svg>
                  </button>
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled">
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