import Vue from "vue"
import './plugins/axios'
import App from "./App.vue"
import "./registerServiceWorker"
import router from "./router"
import store from "./store"
import Vant from 'vant'
import 'vant/lib/index.css'


import './assets/style/global.scss'

Vue.config.productionTip = false

Vue.use(Vant)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app")