Vue.component('app-header', {
    props: ['title'],
    methods: {
    },
    template: `
      <header class="masthead slds-size_2-of-2">
        <h1 class="">{{ title }}</h1>
      </header>
    `
  })