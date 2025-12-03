<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ConfigProvider } from 'ant-design-vue'
import enUS from 'ant-design-vue/es/locale/en_US'
import viVN from 'ant-design-vue/es/locale/vi_VN'
import LanguageSwitcher from '@/shared/components/LanguageSwitcher.vue'
import NavigationMenu from '@/shared/components/NavigationMenu.vue'

const { locale } = useI18n()

const antdLocale = computed(() => {
  return locale.value === 'vi' ? viVN : enUS
})
</script>

<template>
  <ConfigProvider :locale="antdLocale">
    <a-layout class="app-layout">
      <NavigationMenu />
      <a-layout-content class="app-content">
        <div class="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <RouterView />
      </a-layout-content>
    </a-layout>
  </ConfigProvider>
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}

.app-layout {
  min-height: 100vh;
}

.app-content {
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
  position: relative;
}
</style>
