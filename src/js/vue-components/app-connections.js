Vue.component('app-connections', {
  props: ['connections'],
  data : function () {
    return {
    }
  },
  methods: {
    
  },
  template: `
    <article class="slds-card">
      <div class="slds-card__header slds-grid">
        <header class="slds-media slds-media_center slds-has-flexi-truncate">
          <div class="slds-media__figure">
            <span class="slds-icon_container slds-icon-standard-avatar" title="contact">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="../components/salesforce-lightning-design-system/assets/icons/standard-sprite/svg/symbols.svg#avatar"></use>
              </svg>
            </span>
          </div>
          <div class="slds-media__body">
            <h2 class="slds-card__header-title">
              <a href="javascript:void(0);" class="slds-card__header-link slds-truncate">
                <span class="slds-text-heading_small">Connections ({{ connections.length }})</span>
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
                <div class="slds-truncate" title="Type">Type</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Name">Name</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Username">Username</div>
              </th>
              <th scope="col">
                <div class="slds-truncate" title="Status">Status</div>
              </th>
              <th scope="col" style="width: 6.75rem;">
                <div class="slds-truncate" title="Status">Actions</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="slds-hint-parent" v-for="(row, index) in connections">
              <th scope="row">
                <div class="slds-truncate">{{ index+1 }}</div>
              </th>
              <td>
                <div class="slds-truncate">
                <i class="fab fa-github type-icon-medium" v-if="row.type.toLowerCase()=='github'"></i>
                <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon" v-if="row.type.toLowerCase()=='sandbox'"> 
                  <svg class="slds-icon slds-icon_small" aria-hidden="true">
                    <use xlink:href="../components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                  </svg>
                </span>
                &nbsp;&nbsp;{{ row.type }}</div>
              </td>
              <td>
                <div class="slds-truncate"><a href="javascript:void(0);">{{ row.name }}</a></div>
              </td>
              <td>
                <div class="slds-truncate">{{ row.username }}</div>
              </td>
              <td>
                <div class="slds-truncate"><span class="slds-badge" v-bind:class="{ 'success': row.status.toLowerCase()=='actived', 'error': row.status.toLowerCase()=='error' }">{{ row.status }}</span></div>
              </td>
              <td>
                <div class="slds-truncate">
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="../components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#refresh"></use>
                    </svg>
                  </button>
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="../components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#delete"></use>
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