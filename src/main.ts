import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'

import fTable from './components/table/index';
import '@/components/table/style/index.js';

import 'ant-design-vue/dist/antd.css';

const app = createApp(App)

app.config.warnHandler = (e) => {
  // 取消显示原本的warning信息
  // console.log(e)
}

app.use(store).use(router).use(fTable).mount('#app')
