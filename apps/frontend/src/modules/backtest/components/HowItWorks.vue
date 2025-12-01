<template>
  <div class="how-it-works">
    <div class="container">
      <h2 class="section-title">{{ t('backtest.howItWorks.title') }}</h2>
      <p class="section-subtitle">{{ t('backtest.howItWorks.subtitle') }}</p>

      <div class="steps">
        <div class="step" v-for="(step, index) in steps" :key="index">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-icon">
            <component :is="step.icon" />
          </div>
          <h3 class="step-title">{{ t(`backtest.howItWorks.steps.${step.key}.title`) }}</h3>
          <p class="step-description">{{ t(`backtest.howItWorks.steps.${step.key}.description`) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  SettingOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue'

const { t } = useI18n()

const steps = [
  {
    key: 'setParameters',
    icon: SettingOutlined,
  },
  {
    key: 'chooseStrategies',
    icon: UnorderedListOutlined,
  },
  {
    key: 'compareResults',
    icon: BarChartOutlined,
  },
]
</script>

<style scoped>
.how-it-works {
  padding: 80px 24px;
  background-color: #fafafa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.section-subtitle {
  font-size: 18px;
  text-align: center;
  color: #666;
  margin: 0 0 64px 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 48px;
  margin-top: 48px;
}

.step {
  text-align: center;
  position: relative;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.step:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.step-number {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.step-icon {
  font-size: 48px;
  color: #667eea;
  margin: 24px 0 16px 0;
}

.step-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.step-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .how-it-works {
    padding: 60px 16px;
  }

  .section-title {
    font-size: 28px;
  }

  .section-subtitle {
    font-size: 16px;
    margin-bottom: 48px;
  }

  .steps {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>

