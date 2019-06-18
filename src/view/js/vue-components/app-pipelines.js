Vue.component('app-pipelines', {
  props: ['connectionmap', 'pipelines', 'detail'],
  data: function(){
    return {
      menu : {},
    }
  },
  methods: {
    newPipeline: function (ev) {
      app.newPipeline(ev);
    },
    openDetail : function(pid) {
      app.openPipelineDetail(pid);
    },
    rerunPipeline : function(pid, ev) {
      ev.target.setAttribute('disabled','disabled');
      app.runPipeline(pid, function() {
        app.openPipelineDetail(pid);
      });
    },
    editPipeline : function(pid, ev) {
      app.editPipeline(pid);
    },
    clonePipeline : function(pid, ev) {
      ev.target.setAttribute('disabled','disabled');
      app.clonePipeline(pid, function() {
        ev.target.removeAttribute('disabled');
      });
    },
    removePipeline : function(pid, ev) {
      ev.target.setAttribute('disabled','disabled');
      app.removePipeline(pid, function(err, result) {
        ev.target.removeAttribute('disabled');
      });
    },
    taggleMenuDropdown : function(pid, ev) {
      if(this.menu[pid]) {
        this.menu = {};
      } else {
        this.menu = {};
        this.menu[pid] = true;
      }
      ev.stopPropagation();
    },
    hideAllMenu : function() {
      this.menu = {};
    },
    capitalize : function(txt) {
      if(!txt) return txt;
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    }
  },
  template: `
    <article class="slds-card" v-bind:class="{ 'only-show-main': detail!=null}" v-on:click="hideAllMenu">
      <div class="slds-card__header slds-grid" v-if="(pipelines!=null && pipelines.length > 0)">
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
            <button class="slds-button slds-button_neutral" v-on:click="newPipeline">New</button>
          </div>
        </header>
      </div>
      <div class="slds-card__body" v-if="(pipelines!=null && pipelines.length > 0)">
        <table class="slds-table slds-table_fixed-layout slds-table_bordered slds-no-row-hover slds-table_cell-buffer app-table">
          <thead>
            <tr class="slds-text-title_caps">
              <th scope="col" class="main-col" style="width: 3.25rem;">
                <div class="slds-truncate" title="NO">#</div>
              </th>
              <th scope="col" class="main-col">
                <div class="slds-truncate" title="Pipeline">Pipeline</div>
              </th>
              <th scope="col" class="sub-col" style="width: 7rem;">
                <div class="slds-truncate" title="Status">Status</div>
              </th>
              <th scope="col" class="sub-col" style="width: 9rem;">
                <div class="slds-truncate" title="Created">Created</div>
              </th>
              <th scope="col" class="sub-col" style="width: 9rem;">
                <div class="slds-truncate" title="Started">Started</div>
              </th>
              <th scope="col" class="sub-col" style="width: 6rem;">
                <div class="slds-truncate" title="Duration">Duration</div>
              </th>
              <th scope="col" class="sub-col" style="width: 9rem;">
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
                <div class="slds-truncate pipeline-name">
                  <a v-on:click="openDetail(row.id)">{{ row.name }}</a>&nbsp;<span class="slds-badge" v-if="row.checkOnly">Check Only</span><br />
                  <p class="pipeline-desc slds-m-top_xx-small" v-if="connectionmap[row.from]">
                    <i class="fab fa-github type-icon-small" v-if="connectionmap[row.from].type=='github'"></i>
                    <i class="fab fa-bitbucket type-icon-small" v-if="connectionmap[row.from].type=='bitbucket'"></i>
                    <i class="fab fa-git-square type-icon-small" v-if="connectionmap[row.from].type=='git'"></i>
                    <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon" v-if="connectionmap[row.from].type=='sfdc'"> 
                      <svg class="slds-icon slds-icon_xx-small" aria-hidden="true">
                        <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                      </svg>
                    </span>
                    <span v-if="row.type=='changeset'">{{ connectionmap[row.from].name }}</span>
                    <span v-if="row.type=='pr'">{{ connectionmap[row.from].name }}#{{ (row.prs.length > 1) ? row.prs[0].number + '...' : row.prs[0].number }}</span>
                    <span v-if="row.type=='branch'">{{ connectionmap[row.from].name }}#{{ row.branch.name }}</span>
                    <span v-if="row.type=='commit'">{{ connectionmap[row.from].name }}#{{ (row.commits.length > 1) ? row.commits[0].sha.substr(0, 6) + '...' : row.commits[0].sha.substr(0, 6) }}</span>
                    &nbsp;
                    <i class="fas fa-times type-icon-small" v-if="!connectionmap[row.to]"></i>
                    <i class="fas fa-arrow-right type-icon-small" v-if="connectionmap[row.to]"></i>
                    <span v-if="connectionmap[row.to]">
                      &nbsp;
                      <i class="fab fa-github type-icon-small" v-if="connectionmap[row.to].type=='github'"></i>
                      <i class="fab fa-bitbucket type-icon-small" v-if="connectionmap[row.to].type=='bitbucket'"></i>
                      <span class="slds-icon_container slds-icon-utility-salesforce1 type-icon" v-if="connectionmap[row.to].type=='sfdc'"> 
                        <svg class="slds-icon slds-icon_xx-small" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#salesforce1"></use>
                        </svg>
                      </span>
                      {{ connectionmap[row.to].name }}
                    </span>
                  </p><!-- .pipeline-desc -->
                </div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate pipeline-status" v-bind:class="{ 'success': row.status=='successful', 'warning': (row.status=='ready' || row.status=='processing'), 'error': row.status=='failed' }">
                  <i class="fas" v-bind:class="{ 'far fa-pause-circle': row.status=='ready', 
                                                'fas fa-check-circle': row.status=='successful', 
                                                'fas fa-spinner fa-spin': row.status=='processing', 
                                                'fas fa-exclamation-circle': row.status=='failed' }"></i>
                  {{ capitalize(row.status) }}
                </div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">{{ (row.created_at) ? moment(row.created_at).format('YYYY/MM/DD HH:mm') : '' }}</div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">{{ (row.started_at) ? moment(row.started_at).format('YYYY/MM/DD HH:mm') : '' }}</div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate">{{ row.duration || '' }}</div>
              </td>
              <td class="sub-col">
                <div class="slds-truncate actions-col">
                  <ul class="slds-grid slds-button-group">
                    <li class="popover-col">
                      <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-if="row.status!='processing' && row.status!='ready'" v-on:click="rerunPipeline(row.id, $event)">
                        <svg class="slds-button__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#redo"></use>
                        </svg>
                      </button>
                      <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-if="row.status=='ready'" v-on:click="rerunPipeline(row.id, $event)">
                        <svg class="slds-button__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#right"></use>
                        </svg>
                      </button>
                      <button class="slds-button slds-button_icon slds-button_icon-border-filled" disabled="disabled" v-if="row.status=='processing'" v-on:click="rerunPipeline(row.id, $event)">
                        <div role="status" class="slds-spinner slds-spinner_xx-small">
                          <div class="slds-spinner__dot-a"></div>
                          <div class="slds-spinner__dot-b"></div>
                        </div>
                      </button>
                      <div class="slds-popover slds-popover--tooltip slds-nubbin_bottom-right">
                        <div class="slds-popover__body">{{ (row.status=='ready') ? 'Run' : 'Rerun' }}</div>
                      </div>
                    </li>
                    <li class="popover-col slds-button_middle">
                      <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="editPipeline(row.id, $event)">
                        <svg class="slds-button__icon" aria-hidden="true">
                          <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#edit"></use>
                        </svg>
                      </button>
                      <div class="slds-popover slds-popover--tooltip slds-nubbin_bottom-right">
                        <div class="slds-popover__body">Edit</div>
                      </div>
                    </li>
                    <li class="">
                      <div class="slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last" v-bind:class="{'slds-is-open':menu[row.id]}">
                        <button class="slds-button slds-button_icon slds-button_icon-border-filled" v-on:click="taggleMenuDropdown(row.id, $event)">
                          <svg class="slds-button__icon slds-button__icon_small" aria-hidden="true">
                            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#down"></use>
                          </svg>
                        </button>
                        <div class="slds-dropdown slds-dropdown_right slds-dropdown_actions actions-more-dropdown">
                          <ul class="slds-dropdown__list" role="menu">
                            <li class="slds-dropdown__item" role="presentation">
                              <a href="javascript:void(0);" role="menuitem" tabindex="0" v-on:click="clonePipeline(row.id, $event)">
                                <span class="slds-truncate" title="Clone">Clone</span>
                              </a>
                            </li>
                            <li class="slds-dropdown__item" role="presentation" v-if="row.status!='processing' || (row.started_at && moment().diff(moment(row.started_at), 'minutes') > 30)">
                              <a href="javascript:void(0);" class="slds-color-text-error" role="menuitem" tabindex="1" v-on:click="removePipeline(row.id, $event)">
                                <span class="slds-truncate" title="Remove">Remove</span>
                              </a>
                            </li>
                          </ul><!-- .slds-dropdown__list -->
                        </div><!-- .slds-dropdown_actions -->
                      </div>
                    </li>
                    
                  </ul><!-- .slds-button-group -->
                  
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- no conection yet -->
      <div class="slds-wrap slds-grid" v-if="(pipelines==null || pipelines.length == 0)">
        <div class="slds-media slds-media_center no-data-wrap">
          <div class="slds-media__figure">
            <span class="slds-avatar slds-avatar_large">
              <img src="img/ninja-avatar-128.jpg" title="Ninja Avatar" />
            </span>
          </div>
          <div class="slds-media__body">
            <h3>Opps, No Pipeline Yet.</h3>
            <p>Create your first Pipeline. </p>
            <div class="slds-wrap">
              <button class="slds-button slds-button_brand" v-on:click="newPipeline">New Pipeline</button>
            </div>
          </div>
        </div>
      </div><!-- .slds-wrap -->

    </article>
  `
})