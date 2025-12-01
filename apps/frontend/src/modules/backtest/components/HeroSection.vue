<template>
  <div class="hero-section">
    <div class="hero-content">
      <h1 class="hero-title">{{ t('backtest.hero.title') }}</h1>
      <p class="hero-subtitle">{{ t('backtest.hero.subtitle') }}</p>
      
      <div class="hero-badges">
        <a-tag color="green" class="hero-badge">
          <template #icon>
            <CheckCircleOutlined />
          </template>
          {{ t('backtest.hero.badges.free') }}
        </a-tag>
        <a-tag color="blue" class="hero-badge">
          <template #icon>
            <UserOutlined />
          </template>
          {{ t('backtest.hero.badges.noSignup') }}
        </a-tag>
        <a-tag color="orange" class="hero-badge">
          <template #icon>
            <DatabaseOutlined />
          </template>
          {{ t('backtest.hero.badges.realData') }}
        </a-tag>
        <a-tag color="purple" class="hero-badge">
          <template #icon>
            <ThunderboltOutlined />
          </template>
          {{ t('backtest.hero.badges.instant') }}
        </a-tag>
      </div>

      <a-button
        type="primary"
        size="large"
        class="hero-cta"
        @click="scrollToForm"
      >
        <template #icon>
          <RocketOutlined />
        </template>
        {{ t('backtest.hero.cta') }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  CheckCircleOutlined,
  UserOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue'

const { t } = useI18n()

function scrollToForm() {
  const formSection = document.getElementById('strategy-form-section')
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.3;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 24px 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 20px;
  margin: 0 0 32px 0;
  opacity: 0.95;
  line-height: 1.6;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.hero-badge {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.hero-cta {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .hero-section {
    padding: 60px 16px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-badges {
    gap: 8px;
  }

  .hero-badge {
    font-size: 12px;
    padding: 6px 12px;
  }

  .hero-cta {
    height: 48px;
    font-size: 16px;
    padding: 0 32px;
  }
}
</style>

