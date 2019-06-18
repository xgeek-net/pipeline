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
        {type : 'github'},
        function(err, result) {
          app.showModal({ loading : false, data : result });
        }
      );
    },
    /* TODO Fix Bitbucket OAuth issue
    newBitbucketConnect : function(ev) {
      this.connDropdownOpen = false;
      app.showModal({ title : 'Bitbucket' });
      app.request('oauth-login', 
        {type : 'bitbucket'},
        function(err, result) {
          //console.log('>>> bitbucket callback ', result);
          app.showModal({ loading : false, data : result });
        }
      );
    },
    */
    // Add Git Repository (HTTP Only)
    newGitConnect : function(ev) {
      this.connDropdownOpen = false;
      app.showModal({ title : 'Git Repository', loading : false, 
        data : { type : 'git', git_type : 'https' }
      });
    },
    newSfdcConnect : function(orgType) {
      this.connDropdownOpen = false;
      app.showModal({ title : 'Salesforce' });
      app.request('oauth-login', 
        {type : 'sfdc', orgType : orgType},
        function(err, result) {
          app.showModal({ loading : false, data : result });
        }
      );
    },
    taggleConnDropdown : function(ev) {
      if(this.connDropdownOpen) {
        this.connDropdownOpen = false;
      } else {
        this.connDropdownOpen = true;
      }
    },
    delConnect : function(cid, ev){
      ev.target.setAttribute('disabled','disabled');
      app.delConnect(cid, function(err, result) {
        ev.target.removeAttribute('disabled');
      });
    }
  },
  template: `
    <article class="slds-card">
      <div class="slds-card__header slds-grid" v-if="(connections!=null && connections.length > 0)">
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
                  <!-- TODO Fix Bitbucket OAuth issue
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="1" v-on:click="newBitbucketConnect">
                      <span class="slds-truncate" title="Bitbucket">
                        <i class="fab fa-bitbucket type-icon-medium slds-m-right_x-small"></i> Bitbucket
                      </span>
                    </a>
                  </li>
                  -->
                  <li class="slds-dropdown__item" role="presentation">
                      <a href="javascript:void(0);" role="menuitem" tabindex="2" v-on:click="newGitConnect">
                        <span class="slds-truncate" title="Git">
                          <i class="fab fa-git-square type-icon-medium slds-m-right_x-small"></i> Git Repository
                        </span>
                      </a>
                    </li>
                  <li class="slds-dropdown__item" role="presentation">
                    <a href="javascript:void(0);" role="menuitem" tabindex="2" v-on:click="newSfdcConnect('production')">
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
                    <a href="javascript:void(0);" role="menuitem" tabindex="3" v-on:click="newSfdcConnect('sandbox')">
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
      <div class="slds-card__body" v-if="(connections!=null && connections.length > 0)">
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
                <i class="fab fa-bitbucket type-icon-medium" v-if="row.type=='bitbucket'"></i>
                <i class="fab fa-git-square type-icon-medium" v-if="row.type=='git'"></i>
                <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon" v-if="row.type=='sfdc'"> 
                  <svg class="slds-icon slds-icon_small" aria-hidden="true">
                    <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                  </svg>
                </span>
                &nbsp;{{ (row.type=='git') ? 'Git' : ((row.type=='github'||row.type=='bitbucket') ? row.repos.full_name : row.orgType) }}</div>
              </td>
              <td>
                <div class="slds-truncate">{{ row.name }}</div>
              </td>
              <td>
                <div class="slds-truncate">
                  <span class="slds-avatar slds-avatar_small slds-avatar_circle slds-m-right_x-small">
                    <span class="slds-icon_container slds-icon-standard-user">
                      <img v-bind:src='row.avatar' v-if="row.type!='git'" />
                      <img v-bind:src="'https://www.gravatar.com/avatar/' + CryptoJS.MD5(row.username).toString()" v-if="row.type=='git'" />
                    </span>
                  </span>
                  {{ row.username }}</div>
              </td>
              <td>
                <div class="slds-truncate"><span class="slds-badge" v-bind:class="{ 'success': row.status=='actived', 'error': row.status=='error' }">{{ row.status }}</span></div>
              </td>
              <td>
                <div class="slds-truncate actions-col">
                  <ul class="slds-grid slds-button-group">
                    <li class="popover-col">
                      <button class="slds-button slds-button_icon slds-button_icon-border-filled" disabled="disabled" v-on:click="">
                        <svg class="slds-button__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#redo"></use>
                        </svg>
                      </button>
                      <div class="slds-popover slds-popover--tooltip slds-nubbin_bottom-right">
                        <div class="slds-popover__body">Refresh</div>
                      </div>
                    </li>
                    <li class="popover-col">
                      <div class="slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last">
                        <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="delConnect(row.id, $event)">
                          <svg class="slds-button__icon" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
                          </svg>
                        </button>
                        <div class="slds-popover slds-popover--tooltip slds-nubbin_bottom-right">
                          <div class="slds-popover__body">Remove</div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div><!-- .actions-col -->
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- no conection yet -->
      <div class="slds-wrap slds-grid" v-if="(connections==null || connections.length == 0)">
        <div class="slds-media slds-media_center no-data-wrap">
          <div class="slds-media__figure">
            <span class="slds-avatar slds-avatar_large">
              <img src="img/ninja-avatar-128.jpg" title="Ninja Avatar" />
            </span>
          </div>
          <div class="slds-media__body">
            <h3>Opps, No Connection Yet.</h3>
            <p>Create your first connection.</p>
            <div class="slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last" v-bind:class="{'slds-is-open':connDropdownOpen}">
                <button class="slds-button slds-button_brand" v-on:click="taggleConnDropdown">New Connection
                  <svg class="slds-button__icon slds-button__icon_small" aria-hidden="true">
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
                    <!-- TODO Fix Bitbucket OAuth issue
                    <li class="slds-dropdown__item" role="presentation">
                      <a href="javascript:void(0);" role="menuitem" tabindex="1" v-on:click="newBitbucketConnect">
                        <span class="slds-truncate" title="Bitbucket">
                          <i class="fab fa-bitbucket type-icon-medium slds-m-right_x-small"></i> Bitbucket
                        </span>
                      </a>
                    </li> -->
                    <li class="slds-dropdown__item" role="presentation">
                      <a href="javascript:void(0);" role="menuitem" tabindex="2" v-on:click="newGitConnect">
                        <span class="slds-truncate" title="Git">
                          <i class="fab fa-git-square type-icon-medium slds-m-right_x-small"></i> Git Repository
                        </span>
                      </a>
                    </li>
                    <li class="slds-dropdown__item" role="presentation">
                      <a href="javascript:void(0);" role="menuitem" tabindex="3" v-on:click="newSfdcConnect('production')">
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
                      <a href="javascript:void(0);" role="menuitem" tabindex="4" v-on:click="newSfdcConnect('sandbox')">
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
        </div>
      </div><!-- .slds-wrap -->

    </article>
  `
})