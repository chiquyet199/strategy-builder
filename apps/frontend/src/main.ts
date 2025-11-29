import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/vi'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

// Configure dayjs default locale
dayjs.locale('en')

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)
app.use(i18n)

app.mount('#app')
