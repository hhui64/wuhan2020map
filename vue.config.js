module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/wuhan2020map/' : '/',
  lintOnSave: false,
  configureWebpack: {
    externals: {
      'AMap': 'AMap'
    }
  },
  devServer: {
    proxy: {
      '/api-sina': {
        // 此处的写法，目的是为了 将 /api 替换成 url
        target: 'https://interface.sina.cn/news/wap/fymap2020_data.d.json',
        // 允许跨域
        changeOrigin: true,
        // ws: true,
        pathRewrite: {
          '^/api-sina': ''
        }
      }
    }
  }
};