Vue.component('app-modal-connect', {
  props: ['modal'],
  data : function () {
    return {
      form : {
        reposId : '',
        name : ''
      }
    }
  },
  methods: {
    closeModal : function(ev) {
      app.closeModal();
    },
    saveData : function(ev) {
      // TODO Validation
      const data = Object.assign(this.modal.data, this.form);
      const now = new Date();
      let params = {
        type : data.type,
        name : this.form.name,
        username : data.username,
        avatar : data.avatar || '',
        status : 'actived',
        created_at : now.toISOString(),
        updated_at : now.toISOString()
      };
      if(data.type == 'sfdc') {
        params['accessToken'] = data.accessToken;
        params['refreshToken'] = data.refreshToken;
        params['instanceUrl'] = data.instanceUrl;
        params['loginUrl'] = data.loginUrl;
        params['fullname'] = data.fullname;
        params['orgType'] = data.orgType;
        params['orgId'] = data.orgId;
        params['userId'] = data.userId;
      } else {
        // Github or Bitbucket
        let repos;
        for(rep of data.repos) {
          if(rep.id == this.form.reposId) {
            repos = {
              id : rep.id,
              name : rep.name,
              full_name : rep.full_name,
              private : rep.private
            };
            break;
          }
        }

        params['repos'] = repos;
        params['access_token'] = data.access_token;
        params['loginname'] = data.loginname || '';
      }

      app.saveConnect(params);
    },
  },
  template: `
    <div class="slds-modal__container">
      <header class="slds-modal__header">
        <button class="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" title="Close" v-on:click="closeModal">
          <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
          </svg>
        </button>
        <h2 class="slds-text-heading_medium slds-hyphenate">{{ modal.title }}</h2>
      </header>
      <div class="slds-modal__content slds-p-around_medium">
        <div role="status" class="slds-spinner slds-spinner_medium slds-spinner_brand" v-if="modal.loading">
          <span class="slds-assistive-text">Loading</span>
          <div class="slds-spinner__dot-a"></div>
          <div class="slds-spinner__dot-b"></div>
        </div><!-- .slds-spinner -->
        <div class="slds-grid slds-wrap" v-if="modal.data!=null">
          <div class="slds-size_2-of-2">
            <div class="slds-m-around_x-small">
              <span class="slds-avatar slds-avatar_circle slds-m-right_x-small">
                <span class="slds-icon_container slds-icon-standard-user">
                  <img v-bind:src='modal.data.avatar' />
                </span>
              </span>
              {{ (modal.data.type=='sfdc') ? modal.data.fullname : modal.data.username }}
            </div><!-- .slds-m-around_x-small -->
          </div><!-- .slds-size_2-of-2 -->

          <div class="slds-size_2-of-2" v-if="modal.data.type!='sfdc'">
            <div class="slds-m-around_x-small">
              <div class="slds-form-element">
                <label class="slds-form-element__label">Repositories</label>
                <div class="slds-form-element__control">
                  <div class="slds-select_container">
                    <select class="slds-select" v-model="form.reposId">
                      <option value="" selected>--None--</option>
                      <option v-for="rep in modal.data.repos" v-bind:value="rep.id">{{ rep.full_name }}</option>
                    </select>
                  </div>
                </div>
              </div><!-- .slds-form-element -->
            </div><!-- .slds-m-around_x-small -->
          </div><!-- .slds-size_2-of-2 -->

          <div class="slds-size_2-of-2">
            <div class="slds-m-around_x-small">
              <div class="slds-form-element">
                <label class="slds-form-element__label">Name</label>
                <div class="slds-form-element__control">
                  <input type="text" class="slds-input" v-model="form.name" placeholder="Connection Name" />
                </div>
              </div><!-- .slds-form-element -->
            </div><!-- .slds-m-around_x-small -->
          </div><!-- .slds-size_2-of-2 -->

        </div><!-- .slds-grid -->

      </div><!-- .slds-modal__content -->
      <footer class="slds-modal__footer">
        <button class="slds-button slds-button_neutral" v-on:click="closeModal">Cancel</button>
        <button class="slds-button slds-button_brand" v-on:click="saveData">Save</button>
      </footer>
    </div>
  `
})