<template>
  <div class="form-panel">
    <div class="form-header">
      <h2>{{ t('backtest.title') }}</h2>
    </div>

    <div class="form-content">
      <a-tabs v-model:activeKey="activeTab" class="form-tabs">
        <a-tab-pane key="basic" :tab="t('backtest.form.tabs.simple')">
          <BasicForm
            :form-state="formState"
            :show-advanced-portfolio-modal="showAdvancedPortfolioModal"
            @update:show-advanced-portfolio-modal="showAdvancedPortfolioModal = $event"
            @date-range-change="handleDateRangeChange"
            @apply-date-preset="applyDatePreset"
          />
        </a-tab-pane>
        <a-tab-pane key="advanced" :tab="t('backtest.form.tabs.complex')">
          <AdvancedForm
            :form-state="formState"
            :show-advanced-portfolio-modal="showAdvancedPortfolioModal"
            @update:show-advanced-portfolio-modal="showAdvancedPortfolioModal = $event"
            @date-range-change="handleDateRangeChange"
            @apply-date-preset="applyDatePreset"
          />
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- Sticky Submit Button Footer -->
    <div class="form-footer">
      <!-- Error Message -->
      <a-alert
        v-if="backtestStore.error"
        :message="backtestStore.error"
        type="error"
        show-icon
        closable
        @close="backtestStore.error = null"
        style="margin-bottom: 12px"
      />

      <!-- Submit Button -->
      <a-button
        type="primary"
        size="large"
        :loading="backtestStore.isLoading"
        :disabled="
          (formState.mode === 'compare-strategies' &&
            formState.selectedStrategyIds.length === 0) ||
          (formState.mode === 'compare-variants' && formState.selectedVariants.length === 0)
        "
        block
        class="submit-button"
        @click="handleCompare"
      >
        <template #icon>
          <BarChartOutlined />
        </template>
        {{ t('backtest.compareStrategies') }}
      </a-button>
    </div>

    <!-- Advanced Portfolio Setup Modal -->
    <AdvancedPortfolioSetup
      v-model:visible="showAdvancedPortfolioModal"
      :initial-portfolio="formState.initialPortfolio"
      @update:initial-portfolio="(portfolio) => (formState.initialPortfolio = portfolio)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarChartOutlined } from '@ant-design/icons-vue'
import { useBacktestStore } from '../stores/backtestStore'
import { useBacktestForm } from '../composables/useBacktestForm'
import AdvancedPortfolioSetup from './AdvancedPortfolioSetup.vue'
import BasicForm from './BasicForm.vue'
import AdvancedForm from './AdvancedForm.vue'
import dayjs from 'dayjs'

const { t } = useI18n()
const backtestStore = useBacktestStore()
const { formState, handleDateRangeChange, handleCompare } = useBacktestForm()

const activeTab = ref('basic')
const showAdvancedPortfolioModal = ref(false)

function applyDatePreset(preset: { getStartDate: () => dayjs.Dayjs; getEndDate: () => dayjs.Dayjs }) {
  const startDate = preset.getStartDate()
  const endDate = preset.getEndDate()

  handleDateRangeChange({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
}
</script>

<style scoped>
.form-panel {
  width: 400px;
  background: white;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.form-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.form-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 0;
}

.form-tabs {
  margin-bottom: 24px;
}

.form-footer {
  flex-shrink: 0;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.submit-button {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 1200px) {
  .form-panel {
    width: 350px;
  }
}
</style>

