Vue.component('app-message', {
  props: ['message'],
  methods: {
    /**
     * Close Message
     */
    close : function(ev){
      app.closeMessage();
    }
  },
  template: `
    <div class="slds-notify_container">
      <div class="slds-notify slds-notify_toast" v-bind:class="{ 'slds-theme_error' : message.type=='error', 'slds-theme_warning' : message.type=='warning', 'slds-theme_success' : message.type=='success' }" role="alert">
        <span class="slds-assistive-text">message</span>
        <span class="slds-icon_container slds-icon-utility-error slds-m-right_small slds-no-flex slds-align-top">
          <svg class="slds-icon slds-icon_small" aria-hidden="true">
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#error" v-if="message.type=='error'"></use>
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#warning" v-if="message.type=='warning'"></use>
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#success" v-if="message.type=='success'"></use>
          </svg>
        </span>
        <div class="slds-notify__content">
          <h2 class="slds-text-heading_small"><span v-html="message.message"></span></h2>
        </div>
        <button class="slds-button slds-button_icon slds-notify__close slds-button_icon-inverse" v-on:click="close" title="Close">
          <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
            <use xlink:href="components/salesforce-lightning-design-system/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
          </svg>
          <span class="slds-assistive-text">Close</span>
        </button>
      </div>
    </div><!-- .slds-notify_container -->
  `
})