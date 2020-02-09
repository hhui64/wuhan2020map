<template>
  <div id="app">

    <transition :name="transitionName">
      <keep-alive>
        <router-view />
      </keep-alive>
    </transition>

  </div>
</template>

<script>
import areaList from '@/assets/json/area'
import hospitalList from '@/assets/json/hospital'

export default {
  data() {
    return {
      transitionName: ''
    }
  },
  watch: {
    // 使用 watch 监听 $router 的变化
    $route(to, from) {
      // 如果 to.meta.index 大于 from.meta.index，判断为前进状态，反之则为后退状态
      if (to.meta.index > from.meta.index) {
        this.transitionName = 'slide-left' // 设置动画名称-左边
      } else {
        this.transitionName = 'slide-right' // 设置动画名称-右边
      }
    }
  },
  mounted() {
    this.$store.commit('setAreaList', areaList || [])
    this.$store.commit('setHospitalList', hospitalList || [])
  }
}
</script>

<style lang="scss">
@import './assets/style/global.scss';
@import './assets/style/font.scss';

#app {
  height: 100%;
  width: 100%;
  background-color: #f7f8fa;
}
</style>
