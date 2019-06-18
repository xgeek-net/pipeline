Vue.component('app-spinner', {
    props: [],
    methods: {
    },
    template: `
      <div role="status" class="slds-spinner slds-spinner_medium slds-spinner_brand">
        <span class="slds-assistive-text">Loading</span>
        <div class="slds-spinner__dot-a"></div>
        <div class="slds-spinner__dot-b"></div>
      </div><!-- .slds-spinner -->
    `
  })