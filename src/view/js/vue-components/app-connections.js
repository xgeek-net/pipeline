Vue.component('app-connections', {
  props: ['connections'],
  data : function () {
    return {
      connDropdownOpen : false
    }
  },
  methods: {
    newGithubConnect : function(ev) {
      this.connDropdownOpen = false;
      app.showModal({ title : 'Github' });
      app.request('oauth-login', 
        {type : 'github', name : 'github-new-name'},
        function(err, result) {
          app.showModal({ loading : false, data : result });
        }
      );
    },
    newBitbucketConnect : function(ev) {
      this.connDropdownOpen = false;
    },
    newSfdcConnect : function(orgType) {
      this.connDropdownOpen = false;
      console.log('>>>> orgType', orgType);
    },
    taggleConnDropdown : function(ev) {
      if(this.connDropdownOpen) {
        this.connDropdownOpen = false;
      } else {
        this.connDropdownOpen = true;
      }
    },
    delConnect : function(cid){
      
    }
  },
  template: `
    <article class="slds-card">
      <div class="slds-card__header slds-grid">
        <header class="slds-media slds-media_center slds-has-flexi-truncate">
          <div class="slds-media__figure">
            <span class="slds-icon_container slds-icon-standard-avatar" title="contact">
              <svg class="slds-icon slds-icon_small" aria-hidden="true">
                <use xlink:href="components/salesforce-lightning-design-system/assets/icons/standard-sprite/svg/symbols.svg#avatar"></use>
              </svg>
            </span>
          </div>
          <div class="slds-media__body">
            <h2 class="slds-card__header-title">
              <a href="javascript:void(0);" class="slds-card__header-link slds-truncate">
                <span class="slds-text-heading_small">Connections ({{ (connections) ? connections.length : 0 }})</span>
              </a>
            </h2>
          </div>
          <div class="slds-no-flex">
            <div class="slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last" v-bind:class="{'slds-is-open':connDropdownOpen}">
              <button class="slds-button slds-button_neutral" v-on:click="taggleConnDropdown">New
                <svg class="slds-button__icon slds-button__icon_x-small" aria-hidden="true">
                  <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#down"></use>
                </svg>
              </button>
              <div class="slds-dropdown slds-dropdown_right slds-dropdown_actions connect-new-types">
                <ul class="slds-dropdown__list" role="menu">
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="0" v-on:click="newGithubConnect">
                      <span class="slds-truncate" title="Github">
                        <i class="fab fa-github type-icon-medium slds-m-right_x-small"></i> Github
                      </span>
                    </a>
                  </li>
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="1" v-on:click="newBitbucketConnect">
                      <span class="slds-truncate" title="Github">
                        <i class="fab fa-bitbucket type-icon-medium slds-m-right_x-small"></i> Bitbucket
                      </span>
                    </a>
                  </li>
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="2" v-on:click="newSfdcConnect('prod')">
                      <span class="slds-truncate">
                        <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon-medium slds-m-right_x-small">
                          <svg class="slds-icon slds-icon_xx_small" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                          </svg>
                        </span>
                        Salesforce <small>Production</small> 
                      </span>
                    </a>
                  </li>
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="3" v-on:click="newSfdcConnect('sand')">
                      <span class="slds-truncate">
                        <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon-medium slds-m-right_x-small">
                          <svg class="slds-icon slds-icon_xx_small" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                          </svg>
                        </span>
                        Salesforce <small>Sandbox</small>
                      </span>
                    </a>
                  </li>
                </ul>
              </div><!-- .slds-dropdown_actions -->
            </div>
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
                <i class="fab fa-github type-icon-medium" v-if="row.type=='github'"></i>
                <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon" v-if="row.type=='sandbox'"> 
                  <svg class="slds-icon slds-icon_small" aria-hidden="true">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                  </svg>
                </span>
                &nbsp;{{ (row.type=='github') ? row.repos.full_name : row.type }}</div>
              </td>
              <td>
                <div class="slds-truncate">{{ row.name }}</div>
              </td>
              <td>
                <div class="slds-truncate">
                  <span class="slds-avatar slds-avatar_small slds-avatar_circle slds-m-right_x-small" v-if="row.type=='github'">
                    <span class="slds-icon_container slds-icon-standard-user">
                      <img v-bind:src='row.avatar' />
                    </span>
                  </span>
                  {{ row.username }}</div>
              </td>
              <td>
                <div class="slds-truncate"><span class="slds-badge" v-bind:class="{ 'success': row.status=='actived', 'error': row.status=='error' }">{{ row.status }}</span></div>
              </td>
              <td>
                <div class="slds-truncate">
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#refresh"></use>
                    </svg>
                  </button>
                  <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="delConnect(row.id)">
                    <svg class="slds-button__icon" aria-hidden="true">
                      <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#delete"></use>
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