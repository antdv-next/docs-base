import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import Demo from './components/demo/index.vue'
import DemoGroup from './components/demo/group.vue'
import router from './router'

import './assets/styles/index.css'
import 'uno.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.component('Demo', Demo)
app.component('DemoGroup', DemoGroup)
app.mount('#app')
