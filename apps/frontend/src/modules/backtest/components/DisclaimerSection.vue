<template>
  <div class="disclaimer-section">
    <div class="container">
      <a-alert
        :message="t('backtest.disclaimer.title')"
        type="warning"
        show-icon
        :description="disclaimerText"
        class="disclaimer-alert"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const disclaimerText = computed(() => {
  return [
    t('backtest.disclaimer.educational'),
    t('backtest.disclaimer.notAdvice'),
    t('backtest.disclaimer.dataAccuracy'),
  ].join(' ')
})
</script>

<style scoped>
.disclaimer-section {
  padding: 40px 24px;
  background-color: #fafafa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.disclaimer-alert {
  border-radius: 8px;
}

@media (max-width: 768px) {
  .disclaimer-section {
    padding: 32px 16px;
  }
}
</style>

