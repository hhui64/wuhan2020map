import Vue from "vue"
import './plugins/axios'
import App from "./App.vue"
import "./registerServiceWorker"
import router from "./router"
import store from "./store"

import {
  Cell,
  CellGroup,
  Col,
  Row,
  Popup,
  Dialog,
  Toast,
  Notify,
  Tag,
  NavBar,
  Tab, 
  Tabs,
  Area,
  Icon,
  Image,
  Lazyload,
  Loading
} from 'vant'

Vue.config.productionTip = false


Vue.use(Cell)
Vue.use(CellGroup)
Vue.use(Col)
Vue.use(Row)
Vue.use(Popup)
Vue.use(Dialog)
Vue.use(Toast)
Vue.use(Notify)
Vue.use(Tag)
Vue.use(NavBar)
Vue.use(Tab)
Vue.use(Tabs)
Vue.use(Area)
Vue.use(Icon)
Vue.use(Image)
Vue.use(Lazyload)
Vue.use(Loading)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app")