<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ConfigProvider } from 'ant-design-vue'
import enUS from 'ant-design-vue/es/locale/en_US'
import viVN from 'ant-design-vue/es/locale/vi_VN'
import LanguageSwitcher from '@/shared/components/LanguageSwitcher.vue'

const { locale } = useI18n()

const antdLocale = computed(() => {
  return locale.value === 'vi' ? viVN : enUS
})
</script>

<template>
  <ConfigProvider :locale="antdLocale">
    <div id="app">
      <div class="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <RouterView />
    </div>
  </ConfigProvider>
</template>

<style>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
