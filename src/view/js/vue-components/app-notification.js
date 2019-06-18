Vue.component('app-notification', {
    props: ['setting'],
    methods: {
      closeNotification: function() {
        app.hideNotification();
      }
    },
    template: `
      <div class="notify-messages">
        <div class="slds-media slds-media_top">
          <button class="slds-button slds-button_icon close-button" title="Close" v-on:click="closeNotification">
            <svg class="slds-button__icon slds-button__icon_medium" aria-hidden="true">
              <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
            </svg>
          </button>
          <div class="slds-media__figure">
            <span class="slds-avatar slds-avatar_large">
              <img src="img/ninja-avatar-128.jpg" title="Ninja Avatar" />
            </span>
          </div>
          <div class="slds-media__body">
            <p>Hi there, new version {{ setting.appLatestVersion }} is now available! Click here to get update.</p>
            <a class="slds-button slds-button_brand slds-m-top_xx-small" target="_blank" v-bind:href="setting.appLastReleaseUrl">
                <svg class="slds-button__icon slds-button__icon--left" aria-hidden="true">
                  <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#download"></use>
                </svg>
                Download Pipeline
            </a>
          </div>
        </div>
      </div>
    `
})