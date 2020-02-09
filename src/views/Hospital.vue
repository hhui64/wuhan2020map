<template>
  <div class="hospital-wrap h-wrap">
    <TopNav title="发热门诊医院列表"></TopNav>
    <div class="hospital-list">
      <div
        class="hospital-item"
        v-for="(item, index) in cityHospitalList"
        :key="index"
      >
        <div class="yuan"></div>
        <p class="hospital-item__title">{{ item.name }}<van-tag
            class="h-tag"
            plain
            type="primary"
            v-for="(tag, i) in item.type.tags"
            :key="i"
          >{{ tag }}</van-tag>
        </p>
        <p class="hospital-item__info">{{ item.address || '(暂无地址)' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import TopNav from '@/components/public/TopNav.vue'

export default {
  components: {
    TopNav
  },
  data() {
    return {
      cityHospitalList: []
    }
  },
  activated() {
    this.cityHospitalList = this.$store.getters.getCityHospitalList(this.$route.query.province, this.$route.query.city)
  }
}
</script>

<style lang="scss">
.hospital-wrap {
  height: 100%;
}

.hospital-list {
  box-sizing: border-box;
  height: calc(100% - 46px);
  padding: 12px;
  .hospital-item {
    position: relative;
    padding: 12px 12px 12px 26px;
    border-radius: 8px;
    background-color: #fff;
    .yuan {
      position: absolute;
      left: 16px;
      top: 19px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      // background: #409eff;
      box-sizing: border-box;
      border: 1px solid #409eff;
    }
    &:not(:last-child) {
      margin-bottom: 12px;
    }
    p {
      margin: 0 10px;
      &.hospital-item__title {
        margin-bottom: 8px;
        .h-tag {
          display: inline-block;
          vertical-align: top;
          margin-left: 6px;
          margin-top: 2px;
        }
      }
      &.hospital-item__info {
        color: #606266;
        font-size: 13px;
        line-height: 18px;
      }
    }
  }
  overflow-y: scroll;
}
</style>