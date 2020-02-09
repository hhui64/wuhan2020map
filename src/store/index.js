import Vue from "vue"
import Vuex from "vuex"

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    areaList: [],
    hospitalList: [],
    feiyanJsonData: null
  },
  mutations: {
    setAreaList(state, areaList) {
      state.areaList = areaList
    },
    setHospitalList(state, hospitalList) {
      state.hospitalList = hospitalList
    },
    setFeiyanJsonData(state, feiyanJsonData) {
      state.feiyanJsonData = feiyanJsonData
    }
  },
  getters: {
    getCityHospitalList(state) {
      return (province, city) => {
        const provinceObject = state.hospitalList.provinceList.find(item => item.province === province)
        const cityObject = provinceObject ? provinceObject.cityList.find(item => item.city === city) : null
        const hospitalList = cityObject && cityObject.hospitalList ? cityObject.hospitalList : []
        return hospitalList
      }
    }
  },
  actions: {},
  modules: {}
})