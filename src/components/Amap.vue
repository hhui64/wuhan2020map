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
            >{{ info.hospital }}</p>
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
  </div>
</template>

<script>
import Vue from 'vue'
import areaList from '@/assets/json/area'
// import hospitalList from '@/assets/json/hospital'

export default {
  data() {
    let self = this
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
        confirm: 0,
        suspect: 0,
        heal: 0,
        dead: 0
      },
      status: {
        isShowPickerPopup: false,
        isSearchingHospital: false
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
        this.mapGoCity(this.info.city)
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
          this.info.confirm = cityObject ? cityObject.conNum : 0
        }
        // 获取 json 中的发热门诊医院信息并在地图上添加 marker 点
        const cityHospitalList = this.$store.getters.getCityHospitalList(this.info.province, this.info.city)
        if (cityHospitalList.length > 0) {
          this.info.hospital = cityHospitalList.length
          this.mapCodeGetLocation(this.info.city, cityHospitalList)
        } else {
          this.info.hospital = 0
          this.$notify({ type: 'danger', message: '该城市无发热门诊信息' })
        }
        // console.log(cityHospitalList || '当地暂无发热门诊')
      },
      deep: true
    }
  },
  mounted() {
    this.init()
    this.getFeiyanJsonData()
    // 设置默认行政区
    // this.info.province = '湖北省'
    // this.info.city = '武汉市'
    // this.info.adcode = '420100'
  },
  methods: {
    init() {
      const self = this
      this.map = new AMap.Map('amap-container', {
        // center: [116.397428, 39.90923],
        mapStyle: 'amap://styles/838a495f4f0445b41dbd151fcb126cc6',
        resizeEnable: false,
        zoom: 11
      })
      // 设置默认城市行政区
      this.mapGoCity('武汉市')

      /**
       * 初始化插件
       */
      AMap.plugin(this.mapData.loader, () => {
        this.mapData.isLoadedPlugins = true
        this.mapGetLocation()
        this.mapData.plugins.MarkerClusterer = new AMap.MarkerClusterer(this.map, [], {
          gridSize: 40,
          minClusterSize: 3
        })
        this.mapData.plugins.InfoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(3, -35) })
      })
    },
    /**
     * 获取当前定位信息
     */
    mapGetLocation() {
      const self = this
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

      this.mapData.plugins.Geolocation.getCurrentPosition()

      AMap.event.addListener(this.mapData.plugins.Geolocation, 'complete', onComplete)
      AMap.event.addListener(this.mapData.plugins.Geolocation, 'error', onError)

      function onComplete(data) {
        // data是具体的定位信息
        console.log(data)
        // 处理地图定位
        if (data && data.position) {
          // 省市信息
          self.info.province = data.addressComponent.province
          self.info.city = data.addressComponent.city
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
              469025: 469425,
            }
            if (Object.keys(exAdcodeEnum).includes(data.addressComponent.adcode)) {
              data.addressComponent.adcode = exAdcodeEnum[data.addressComponent.adcode]
              console.log(data.addressComponent.adcode)
            }
          }
          self.info.adcode = data.addressComponent.adcode
          // self.mapGoCity(self.info.adcode)
          self.$nextTick()
        }
      }

      function onError(data) {
        // 定位出错
        self.$notify({ type: 'danger', message: '无法获取定位信息' })
        console.error(data)
      }
    },
    /**
     * 设置地图行政区
     */
    mapGoCity(city) {
      this.map.setCity(city)
    },
    async mapCodeGetLocation(city, address) {
      // 实例化插件对象
      this.mapData.PlaceSearch = new AMap.PlaceSearch({
        city: city,
        citylimit: true
        // type: '医疗保健服务'
      })

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

      this.$notify({ type: 'warning', duration: 0, message: '正在查询，请稍后...' })
      this.status.isSearchingHospital = true

      let _addressExArray = address.map(item => item.name || item.exAddress || item.address),
        _resultExArray = []

      if (Array.isArray(address)) {
        for (let i = 0; i < _addressExArray.length; i++) {
          this.mapData.PlaceSearch.search(_addressExArray[i], (status, result) => {
            if (status === 'complete' && (result.info === 'OK' || result.info === 'TIP_KEYWORDS')) {
              _resultExArray.push(result.poiList.pois)
            } else {
              _resultExArray.push(null)
              console.log('获取失败: ', _addressExArray[i], status, result)
            }
            if (_resultExArray.length >= address.length) {
              console.log(_resultExArray)
              resultEvent()
            }
          })
        }
      } else {
        // ...
      }

      const resultEvent = () => {
        // 清除地图上原有的点标记
        this.map.remove(this.mapData.markers)
        this.mapData.markers = []
        this.mapData.plugins.MarkerClusterer.clearMarkers()

        for (let i = 0; i < _resultExArray.length; i++) {
          if (_resultExArray[i]) {
            if (_resultExArray[i][0]) {
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
                position: _resultExArray[i][0].location
              })

              marker.content = `<div class="info-window">
                  <p class="hospital-name">${_resultExArray[i][0].name}</p>
                  <p class="hospital-info">${_resultExArray[i][0].address}</p>
                </div>`
              marker.on('click', e => {
                this.mapData.plugins.InfoWindow.setContent(e.target.content)
                this.mapData.plugins.InfoWindow.open(this.map, e.target.getPosition())
              })
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

        this.$notify({ type: 'success', message: '查询成功' })

        this.status.isSearchingHospital = false
      }
    },
    /**
     * 绘制行政区域边界
     */
    mapDrawCityBounds(city) {
      this.mapData.plugins.DistrictSearch = new AMap.DistrictSearch({
        // 关键字对应的行政区级别，country表示国家
        level: 'city',
        // 显示下级行政区级数，1表示返回下一级行政区
        subdistrict: 1,
        // 返回所有信息，里面包括边界线信息，用以绘制
        extensions: 'all'
      })
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
                strokeColor: '#188ffc', // 边界色
              })
              this.mapData.polygons.push(polygon)
            }
          }
        }
      })
    },
    openAreaPicker() {
      if (this.status.isSearchingHospital) return
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
      // this.status.isShowPickerPopup = false
    },
    onCalcelArea() {
      this.closeAreaPicker()
    },
    onClickHospital() {
      if (this.status.isSearchingHospital) return
      this.$router.push({
        name: 'Hospital',
        query: {
          province: this.info.province,
          city: this.info.city,
          adcode: this.info.adcode
        }
      })
    },
    getFeiyanJsonData() {
      this.axios.get('/fymap2020_data.d.json').then(res => {
        this.feiyanJsonData = res.data
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
