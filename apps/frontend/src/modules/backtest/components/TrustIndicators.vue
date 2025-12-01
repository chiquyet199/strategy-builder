<template>
  <div class="trust-indicators">
    <div class="container">
      <div class="indicators-grid">
        <div class="indicator-item">
          <div class="indicator-icon">
            <BookOutlined />
          </div>
          <h3 class="indicator-title">{{ t('backtest.trustIndicators.educational.title') }}</h3>
          <p class="indicator-description">{{ t('backtest.trustIndicators.educational.description') }}</p>
        </div>

        <div class="indicator-item">
          <div class="indicator-icon">
            <DatabaseOutlined />
          </div>
          <h3 class="indicator-title">{{ t('backtest.trustIndicators.dataSource.title') }}</h3>
          <p class="indicator-description">{{ t('backtest.trustIndicators.dataSource.description') }}</p>
        </div>

        <div class="indicator-item">
          <div class="indicator-icon">
            <LockOutlined />
          </div>
          <h3 class="indicator-title">{{ t('backtest.trustIndicators.privacy.title') }}</h3>
          <p class="indicator-description">{{ t('backtest.trustIndicators.privacy.description') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  BookOutlined,
  DatabaseOutlined,
  LockOutlined,
} from '@ant-design/icons-vue'

const { t } = useI18n()
</script>

<style scoped>
.trust-indicators {
  padding: 60px 24px;
  background-color: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.indicator-item {
  text-align: center;
  padding: 24px;
}

.indicator-icon {
  font-size: 40px;
  color: #667eea;
  margin-bottom: 16px;
}

.indicator-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1a1a1a;
}

.indicator-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .trust-indicators {
    padding: 40px 16px;
  }

  .indicators-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>

