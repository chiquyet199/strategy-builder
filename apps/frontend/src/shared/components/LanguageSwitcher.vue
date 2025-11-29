<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'

const { locale } = useI18n()

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
]

const currentLanguage = ref(
  languages.find(lang => lang.code === locale.value) || languages[0]
)

const changeLanguage = (langCode: string) => {
  locale.value = langCode
  localStorage.setItem('locale', langCode)
  currentLanguage.value = languages.find(lang => lang.code === langCode) || languages[0]
}

watch(locale, (newLocale) => {
  currentLanguage.value = languages.find(lang => lang.code === newLocale) || languages[0]
})
</script>

<template>
  <a-dropdown :trigger="['click']" placement="bottomRight">
    <a-button type="text" class="language-switcher">
      <span class="mr-2">{{ currentLanguage.flag }}</span>
      <span>{{ currentLanguage.label }}</span>
    </a-button>
    <template #overlay>
      <a-menu @click="({ key }) => changeLanguage(key as string)">
        <a-menu-item
          v-for="lang in languages"
          :key="lang.code"
          :class="{ 'ant-menu-item-selected': locale === lang.code }"
        >
          <span class="mr-2">{{ lang.flag }}</span>
          {{ lang.label }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
}
</style>

