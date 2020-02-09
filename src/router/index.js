import Vue from "vue";
import VueRouter from "vue-router"
import Map from "../views/Map.vue"
import Hospital from '../views/Hospital.vue'

Vue.use(VueRouter)

const routes = [{
  path: '/',
  name: 'Map',
  component: Map,
  meta: {
    index: 0,
    keepAlive: true
  }
}, {
  path: '/hospital',
  name: 'Hospital',
  component: Hospital,
  meta: {
    index: 1,
    keepAlive: false
  }
}]

const router = new VueRouter({
  routes
})

export default router
