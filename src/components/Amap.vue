<template>
  <div class="amap-wrap">
    <div id="amap-container"></div>
    <div class="h-card z-300">
      <van-row class="info-row">
        <van-col span="8">
          <div class="info-col">
            <p
              class="number blue"
              :class="{ 'size-small': info.city.length > 4 }"
              @click="openAreaPicker"
            >{{ info.city || '未知' }}</p>
            <p class="text">您的城市</p>
          </div>
        </van-col>
        <van-col span="8">
          <div class="info-col">
            <p
              class="number number-font green"
              @click="onClickHospital"
            >{{ info.hospitalList.length }}</p>
            <p class="text">发热门诊</p>
          </div>
        </van-col>
        <van-col span="8">
          <div class="info-col">
            <p class="number number-font red">{{ info.confirm }}</p>
            <p class="text">确诊人数</p>
          </div>
        </van-col>
      </van-row>
    </div>
    <div class="h-copyright z-300">
      <p>© 2020 HUANGHU1</p>
    </div>
    <!-- 选择城市弹框 -->
    <van-popup
      v-model="status.isShowPickerPopup"
      position="bottom"
    >
      <van-area
        :value="info.adcode"
        :area-list="areaList"
        :columns-num="2"
        :swipe-duration="500"
        title="选择所在城市"
        @confirm="onConfirmArea"
        @cancel="onCalcelArea"
      />
    </van-popup>
    <!-- 医院列表弹框 -->
    <van-popup
      v-model="status.isShowHospitalListPopup"
      round
      position="bottom"
      :closeable="true"
      close-icon-position="top-left"
      class="h-popup no-select"
      :style="{ height: '90%' }"
      :lazy-render="false"
      @close="onCloseHospitalListPopup"
      @open="onOpenHospitalListPopup"
    >
      <div class="popup-header">
        <p class="title">全部 {{ info.hospitalList.length }} 家发热门诊医院</p>
      </div>
      <div class="popup-main">
        <ul
          ref="hl"
          class="h-list"
        >
          <li
            v-for="(item, index) in info.hospitalList"
            :key="index"
            @click="hospitalListItemClick(index)"
          >
            <div class="item-wrap">
              <van-image
                class="item-image clearfix"
                width="4rem"
                height="4rem"
                fit="cover"
                lazy-load
                :src="item.amapInfo ? (item.amapInfo.pois[0].photos.length ? item.amapInfo.pois[0].photos[0].url : '') : ''"
                error-icon="question-o"
              >
                <template v-slot:loading>
                  <van-loading
                    type="spinner"
                    size="20"
                  />
                </template>
              </van-image>
              <div class="item-info">
                <p class="title">{{ item.name || (item.amapInfo ? item.amapInfo.pois[0].name : '') }}</p>
                <p class="tags">
                  <van-tag
                    class="h-tag"
                    plain
                    type="primary"
                    v-if="item.isDesignated"
                  >定点医院</van-tag>
                </p>
                <p class="address">{{ (item.amapInfo ? item.amapInfo.pois[0].address : '') || item.address || '(暂无地址)' }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </van-popup>
  </div>
</template>

<script>
import areaList from '@/assets/json/area'

export default {
  data() {
    return {
      map: null,
      mapData: {
        isLoadedPlugins: false,
        loader: [
          'AMap.Geolocation',
          'AMap.Geocoder',
          'AMap.MarkerClusterer',
          'AMap.PlaceSearch',
          'AMap.DistrictSearch'
        ],
        plugins: {
          DistrictSearch: null,
          Geolocation: null,
          Geocoder: null,
          PlaceSearch: null,
          MarkerClusterer: null,
          InfoWindow: null
        },
        markers: [],
        polygons: [],
        districtList: []
      },
      info: {
        province: '',
        city: '',
        adcode: '',
        hospital: 0,
        hospitalList: [],
        confirm: 0,
        suspect: 0,
        heal: 0,
        dead: 0
      },
      status: {
        isShowPickerPopup: false,
        isShowHospitalListPopup: false,
        isSearchingHospital: false,
        scrollTop: 0
      },
      areaList: areaList,
      feiyanJsonData: []
    }
  },
  watch: {
    'info.city': {
      handler: function() {
        // 是否正在搜索中...
        if (this.status.isSearchingHospital) return
        // 设置地图行政区
        this.map.setCity(this.info.city)
        // 绘制行政区边界
        this.mapDrawCityBounds(this.info.city)
        // 切换城市时，关闭地图上已打开的信息窗口
        if (this.mapData.plugins.InfoWindow) {
          this.mapData.plugins.InfoWindow.close(this.map)
        }
        // 获取医院列表、当地肺炎详情数据
        if (['北京市', '上海市', '天津市', '重庆市'].includes(this.info.city)) {
          this.info.confirm = this.feiyanJsonData.data.list.find(
            item => item.name === this.info.city.slice(0, -1)
          ).value
        } else {
          const exProvinceNameList = {
            150000: '内蒙古',
            450000: '广西',
            540000: '西藏',
            640000: '宁夏',
            650000: '新疆',
            810000: '香港',
            820000: '澳门'
          }
          const exProvinceName = exProvinceNameList[this.info.adcode.slice(0, -4) + '0000']
          let provinceName = '',
            cityName = ''
          provinceName = exProvinceName || this.info.province.slice(0, -1)
          cityName = this.info.city
          let provinceObject = this.feiyanJsonData.data.list.find(item => item.name === provinceName)
          let cityObject = provinceObject.city.find(item => item.mapName === cityName)
          // 更新疫情数据信息
          this.info.confirm = cityObject ? cityObject.conNum : 0
          this.info.suspect = cityObject ? cityObject.susNum : 0
          this.info.heal = cityObject ? cityObject.cureNum : 0
          this.info.dead = cityObject ? cityObject.deathNum : 0
        }
        // 获取 json 中的发热门诊医院信息并在地图上添加 marker 点
        const cityHospitalList = this.$store.getters.getCityHospitalList(this.info.province, this.info.city)
        if (cityHospitalList.length > 0) {
          this.info.hospitalList = cityHospitalList
          this.mapPlaceSearch(this.info.city, cityHospitalList)
        } else {
          this.info.hospitalList = []
          this.$notify({ type: 'danger', message: '该城市暂无发热门诊信息' })
        }
        // console.log(cityHospitalList || '当地暂无发热门诊')
      },
      deep: true
    },
    'info.hospitalList': {
      handler: function() {
        this.status.scrollTop = 0
      },
      deep: false
    }
  },
  mounted() {
    this.init()
    // 设置默认行政区
    // this.info.province = '湖北省'
    // this.info.city = '武汉市'
    // this.info.adcode = '420100'
  },
  methods: {
    init() {
      /**
       * 获取肺炎信息实时数据
       */
      this.getFeiyanJsonData()
      /**
       * 初始化地图对象
       */
      this.map = new AMap.Map('amap-container', {
        mapStyle: 'amap://styles/838a495f4f0445b41dbd151fcb126cc6',
        resizeEnable: false,
        zoom: 11
      })
      // 设置默认城市行政区
      this.map.setCity('武汉市')

      /**
       * 初始化插件
       */
      AMap.plugin(this.mapData.loader, () => {
        this.mapData.isLoadedPlugins = true
        /**
         * 实例化 Geolocation
         */
        this.mapData.plugins.Geolocation = new AMap.Geolocation({
          // 是否使用高精度定位，默认：true
          enableHighAccuracy: true,
          // 设置定位超时时间，默认：无穷大
          timeout: 5000,
          // 定位按钮的停靠位置的偏移量，默认：Pixel(10, 20)
          buttonOffset: new AMap.Pixel(10, 180),
          //  定位成功后调整地图视野范围使定位位置及精度范围视野内可见，默认：false
          // zoomToAccuracy: true,
          //  定位按钮的排放位置,  RB表示右下
          buttonPosition: 'RB'
        })
        this.map.addControl(this.mapData.plugins.Geolocation)
        this.mapGetLocation()

        /**
         * 实例化 MarkerClusterer
         */
        this.mapData.plugins.MarkerClusterer = new AMap.MarkerClusterer(this.map, [], {
          gridSize: 40,
          minClusterSize: 3
        })

        /**
         * 实例化 InfoWindow
         */
        this.mapData.plugins.InfoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(3, -35) })

        /**
         * 实例化 DistrictSearch
         */
        this.mapData.plugins.DistrictSearch = new AMap.DistrictSearch({
          // 关键字对应的行政区级别，country表示国家
          level: 'city',
          // 显示下级行政区级数，1表示返回下一级行政区
          subdistrict: 1,
          // 返回所有信息，里面包括边界线信息，用以绘制
          extensions: 'all'
        })

        /**
         * 实例化 PlaceSearch
         */
        this.mapData.PlaceSearch = new AMap.PlaceSearch({
          // city: city,
          citylimit: true,
          extensions: 'all',
          type: '医疗保健服务'
        })
      })
    },
    /**
     * 获取当前定位信息
     */
    mapGetLocation() {
      this.mapData.plugins.Geolocation.getCurrentPosition()

      const onComplete = data => {
        // data是具体的定位信息
        console.log(data)
        // 处理地图定位
        if (data && data.position) {
          // 省市信息
          this.info.province = data.addressComponent.province
          this.info.city = data.addressComponent.city
          if (data.addressComponent.adcode.slice(2, 4) == '90') {
            const exAdcodeEnum = {
              // 河南
              410181: 419181,
              411481: 419281,
              411381: 419381,
              410728: 419428,
              410482: 419582,
              // 湖北
              429004: 429104,
              429005: 429205,
              429006: 429306,
              429021: 429421,
              // 海南
              469005: 468005,
              469002: 468102,
              469007: 468207,
              469006: 468306,
              469001: 468401,
              469029: 468529,
              469023: 468623,
              469022: 468722,
              469027: 468827,
              469028: 468928,
              469030: 469030,
              469026: 469126,
              469024: 469224,
              469021: 469321,
              469025: 469425
            }
            if (Object.keys(exAdcodeEnum).includes(data.addressComponent.adcode)) {
              data.addressComponent.adcode = exAdcodeEnum[data.addressComponent.adcode]
              console.log(data.addressComponent.adcode)
            }
          }
          this.info.adcode = data.addressComponent.adcode
          // this.map.setCity(this.info.adcode)
          this.$nextTick()
        }
      }

      const onError = data => {
        // 定位出错
        this.$notify({ type: 'danger', message: '无法获取定位信息' })
        console.error(data)
      }

      // 添加监听事件
      AMap.event.addListener(this.mapData.plugins.Geolocation, 'complete', onComplete)
      AMap.event.addListener(this.mapData.plugins.Geolocation, 'error', onError)
    },
    /**
     * 搜索地址并在地图上生成点标记
     */
    async mapPlaceSearch(city, address) {
      // 清除地图上原有的点标记
      this.map.remove(this.mapData.markers)
      this.mapData.markers = []
      this.mapData.plugins.MarkerClusterer.clearMarkers()

      // 设置搜索城市
      this.mapData.PlaceSearch.setCity(city)

      // 置使能状态信息
      this.$notify({ type: 'warning', duration: 0, message: '正在查询，请稍后...' })
      this.status.isSearchingHospital = true

      // 同步版 POI 查询
      // const asyncPlaceSearch = async keywords => {
      //   return new Promise((resolve, reject) => {
      //     this.mapData.PlaceSearch.search(keywords, (status, result) => {
      //       if (status === 'complete' && result.info === 'OK') {
      //         resolve(result)
      //       } else {
      //         reject(result)
      //       }
      //     })
      //   })
      // }

      let _addressExArray = address.map(item => item.name || item.exAddress || item.address)

      if (Array.isArray(address)) {
        let count = 0
        for (let i = 0; i < _addressExArray.length; i++) {
          this.mapData.PlaceSearch.search(_addressExArray[i], (status, result) => {
            count++
            if (status === 'complete' && (result.info === 'OK' || result.info === 'TIP_KEYWORDS')) {
              this.info.hospitalList.find(item => item.name === address[i].name).amapInfo = {
                pois: result.poiList.pois
              }
            } else {
              console.log('获取失败: ', _addressExArray[i], status, result)
            }
            if (count >= address.length) {
              resultEvent()
            }
          })
        }
      } else {
        // ...
      }

      const resultEvent = () => {
        // 遍历所有返回的 POI 然后绘制 Marker
        for (let i = 0; i < this.info.hospitalList.length; i++) {
          if (this.info.hospitalList[i] && this.info.hospitalList[i].amapInfo) {
            const pois = this.info.hospitalList[i].amapInfo.pois[0]
            if (pois) {
              const marker = new AMap.Marker({
                icon: new AMap.Icon({
                  // 图标尺寸
                  size: new AMap.Size(25, 34),
                  // 图标的取图地址
                  image: require('../assets/poi-marker-red.png'),
                  // 图标所用图片大小
                  imageSize: new AMap.Size(25, 34)
                  // 图标取图偏移量
                  // imageOffset: new AMap.Pixel(-9, -3)
                }),
                position: pois.location
              })

              marker.content = `<div class="info-window">
                  <p class="hospital-name">${pois.name}</p>
                  <p class="hospital-info">${pois.address}</p>
                </div>`
              marker.on('click', e => {
                this.mapData.plugins.InfoWindow.setContent(e.target.content)
                this.mapData.plugins.InfoWindow.open(this.map, e.target.getPosition())
              })

              this.info.hospitalList[i].amapInfo.marker = marker
              this.mapData.markers.push(marker)
            }
          }
        }
        // 地图添加点
        this.map.add(this.mapData.markers)
        // 设置点聚合
        this.mapData.plugins.MarkerClusterer.setMarkers(this.mapData.markers)
        // 视角范围自适应
        // this.map.setFitView(this.mapData.markers)

        // console.log(this.info.hospitalList)

        this.$notify({ type: 'success', message: '查询成功' })

        this.status.isSearchingHospital = false
      }
    },
    /**
     * 绘制行政区域边界
     */
    mapDrawCityBounds(city) {
      this.mapData.plugins.DistrictSearch.search(city, (status, result) => {
        if (status == 'complete') {
          let bounds = result.districtList[0].boundaries
          // 先移除之前已绘制的边界图形
          this.map.remove(this.mapData.polygons)
          // 绘制
          if (bounds) {
            for (let i = 0; i < bounds.length; i++) {
              // 生成行政区划 polygon
              let polygon = new AMap.Polygon({
                map: this.map,
                strokeWeight: 1, // 边界线宽
                // strokeStyle: 'dashed',
                path: bounds[i],
                fillOpacity: 0, // 填充色透明度
                fillColor: '#ffffff', // 填充色
                strokeOpacity: 1,
                strokeColor: '#188ffc' // 边界色
              })
              this.mapData.polygons.push(polygon)
            }
          }
        }
      })
    },
    openAreaPicker() {
      if (this.status.isSearchingHospital) {
        this.$toast('正在查询中')
        return
      }
      this.status.isShowPickerPopup = true
    },
    closeAreaPicker() {
      this.status.isShowPickerPopup = false
    },
    onConfirmArea(o) {
      this.closeAreaPicker() // 先处理关闭，避免卡顿
      if (this.status.isSearchingHospital) return // 查询未完成时，不切换
      const province = areaList.province_list[o[0].code]
      const city = areaList.city_list[o[1].code]
      this.info.province = province
      this.info.city = city
      this.info.adcode = o[1].code.toString()
    },
    onCalcelArea() {
      this.closeAreaPicker()
    },
    onClickHospital() {
      if (this.status.isSearchingHospital) {
        this.$toast('正在查询中')
        return
      }
      if (this.info.hospitalList.length <= 0) {
        this.$toast('该城市暂无发热门诊信息')
        return
      }
      this.status.isShowHospitalListPopup = true

      // this.$router.push({
      //   name: 'Hospital',
      //   query: {
      //     province: this.info.province,
      //     city: this.info.city,
      //     adcode: this.info.adcode
      //   }
      // })
    },
    hospitalListItemClick(index) {
      if (this.info.hospitalList[index].amapInfo) {
        const marker = this.info.hospitalList[index].amapInfo.marker
        const location = this.info.hospitalList[index].amapInfo.pois[0].location
        if (location && marker) {
          this.status.isShowHospitalListPopup = false
          setTimeout(() => {
            this.mapData.plugins.InfoWindow.setContent(marker.content)
            this.mapData.plugins.InfoWindow.open(this.map, marker.getPosition())
            this.map.setZoomAndCenter(14, marker.getPosition())
          }, 300)
        }
      } else {
        this.$toast('该医院暂无信息')
      }
    },
    onOpenHospitalListPopup() {
      this.$nextTick(() => {
        this.$refs.hl.scrollTop = this.status.scrollTop
      })
    },
    onCloseHospitalListPopup() {
      this.$nextTick(() => {
        this.status.scrollTop = this.$refs.hl.scrollTop
      })
    },
    getFeiyanJsonData() {
      this.axios
        .get('/fymap2020_data.d.json')
        .then(res => {
          this.feiyanJsonData = res.data
        })
        .catch(err => {
          this.$toast('获取数据失败')
          console.err(err)
        })
    }
  }
}
</script>

<style lang="scss">
.amap-wrap {
  position: relative;
  height: 100%;
  width: 100%;
}

.h-card {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 34px;
  padding: 18px 2px;
  width: calc(100% - 26px);
  max-width: 800px;
  height: 60px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 12px #0000000d;
  .info-row {
    height: 100%;
    .info-col,
    .van-col {
      height: 100%;
    }
    .van-col {
      border-right: 1px solid #f7f7f7;
    }
    .van-col:last-child {
      border-right-width: 0;
    }
    .info-col {
      p {
        margin: 0;
        text-align: center;
        &.number {
          margin-bottom: 7px;
          padding: 0 6px;
          font-size: 1.5rem;
          font-weight: bold;
          line-height: 33px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          &.number-font {
            font-family: 'DIN Condensed Bold Min';
            font-size: 1.95rem;
            font-weight: normal;
            padding-top: 4px;
            margin-bottom: 3px;
          }
          &.size-small {
            font-size: 1rem;
          }
          &.blue {
            color: #409eff;
          }
          &.red {
            color: #f56c6c;
          }
          &.green {
            color: #67c23a;
          }
        }
        &.text {
          font-size: 0.875rem;
          color: #909399;
        }
      }
    }
  }
}

.h-popup {
  // overflow: hidden;
  // -webkit-overflow-scrolling: unset;
  // position: relative;
  box-sizing: border-box;
  padding-top: 50px;
  // background-color: #f7f8fa;
  &.van-popup--bottom.van-popup--round {
    border-radius: 10px 10px 0 0;
  }
  .popup-header {
    position: absolute;
    top: 0;
    width: 100%;
    height: 50px;
    border-bottom: 1px solid #ebedf0;
    background-color: #fff;
    box-sizing: border-box;
    p.title {
      margin: 0;
      line-height: 50px;
      text-align: center;
      font-weight: 500;
    }
  }
  .popup-main {
    height: 100%;
  }
}

ul.h-list {
  // padding: 20px;
  height: 100%;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  li {
    display: block;
    // padding: 10px;
    // padding-left: 0;
    // height: 64px;
    background-color: #fff;
    &:not(:last-child) {
      .item-wrap {
        border-bottom: 1px solid #ebedf0;
      }
    }
    &:active {
      background-color: #f2f3f5;
    }
    .item-wrap {
      position: relative;
      margin-left: 10px;
      padding: 10px 10px 10px 0;
      height: 64px;
      .item-image {
        display: block;
        float: left;
        border-radius: 6px;
        overflow: hidden;
        box-sizing: border-box;
      }
      .item-info {
        margin-left: 76px;
        p {
          margin: 0;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          &.title {
            line-height: 16px;
            margin-bottom: 6px;
          }
          &.tags {
            line-height: 20px;
            margin-bottom: 5px;
          }
          &.address {
            font-size: 12px;
            color: #606266;
          }
        }
      }
    }
  }
}

.h-copyright {
  position: absolute;
  bottom: 10px;
  width: 100%;
  p {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: #606266;
  }
}

.info-window {
  padding: 10px;
  min-width: 200px;
  p.hospital-name {
    margin-top: 0;
    font-size: 16px;
    color: #409eff;
    font-weight: 500;
  }
  p.hospital-info {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

#amap-container {
  height: 100%;
}
</style>
