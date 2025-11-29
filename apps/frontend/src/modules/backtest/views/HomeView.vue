<template>
  <div class="home-view">
    <a-card class="strategy-selection-card">
      <template #title>
        <h1>Compare Investment Strategies</h1>
      </template>

      <a-form :model="formState" layout="vertical" @submit.prevent="handleCompare">
        <!-- Investment Amount -->
        <a-form-item label="Investment Amount (USD)" required>
          <a-input-number
            v-model:value="formState.investmentAmount"
            :min="1"
            :max="10000000"
            :step="1000"
            :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
            style="width: 100%"
            size="large"
          />
        </a-form-item>

        <!-- Date Range -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date" required>
              <a-date-picker
                v-model:value="formState.startDate"
                style="width: 100%"
                size="large"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date" required>
              <a-date-picker
                v-model:value="formState.endDate"
                style="width: 100%"
                size="large"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Preset Date Ranges -->
        <a-form-item label="Quick Select">
          <a-space>
            <a-button @click="setPresetRange('2020-2025')">2020-2025</a-button>
            <a-button @click="setPresetRange('2021-2023')">2021-2023</a-button>
            <a-button @click="setPresetRange('2022-2024')">2022-2024</a-button>
            <a-button @click="setPresetRange('2023-2025')">2023-2025</a-button>
          </a-space>
        </a-form-item>

        <!-- Strategy Selection -->
        <a-form-item label="Select Strategies" required>
          <a-checkbox-group v-model:value="formState.selectedStrategyIds" style="width: 100%">
            <a-row>
              <a-col :span="12" v-for="strategy in availableStrategies" :key="strategy.id">
                <a-checkbox :value="strategy.id">{{ strategy.name }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>

        <!-- Error Message -->
        <a-alert
          v-if="backtestStore.error"
          :message="backtestStore.error"
          type="error"
          show-icon
          closable
          @close="backtestStore.error = null"
          style="margin-bottom: 16px"
        />

        <!-- Submit Button -->
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="backtestStore.isLoading"
            :disabled="formState.selectedStrategyIds.length === 0"
            block
          >
            Compare Strategies
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import { backtestService } from '../services/backtestService'
import dayjs, { type Dayjs } from 'dayjs'
import type { StrategyMetadata } from '@/shared/types/backtest'

const router = useRouter()
const backtestStore = useBacktestStore()

const availableStrategies: StrategyMetadata[] = [
  { id: 'lump-sum', name: 'Lump Sum' },
  { id: 'weekly-dca', name: 'Weekly DCA' },
  { id: 'monthly-dca', name: 'Monthly DCA' },
  { id: 'rsi-dca', name: 'RSI DCA' },
  { id: 'dip-buyer-dca', name: 'Dip Buyer DCA' },
  { id: 'moving-average-dca', name: 'Moving Average DCA' },
  { id: 'combined-smart-dca', name: 'Combined Smart DCA' },
]

const formState = reactive({
  investmentAmount: backtestStore.investmentAmount,
  startDate: dayjs(backtestStore.startDate) as Dayjs,
  endDate: dayjs(backtestStore.endDate) as Dayjs,
  selectedStrategyIds: [] as string[],
})

function setPresetRange(preset: string) {
  const ranges: Record<string, { start: string; end: string }> = {
    '2020-2025': { start: '2020-01-01', end: '2025-11-28' },
    '2021-2023': { start: '2021-01-01', end: '2023-12-31' },
    '2022-2024': { start: '2022-01-01', end: '2024-12-31' },
    '2023-2025': { start: '2023-01-01', end: '2025-11-28' },
  }

  const range = ranges[preset]
  if (range) {
    formState.startDate = dayjs(range.start) as Dayjs
    formState.endDate = dayjs(range.end) as Dayjs
  }
}

async function handleCompare() {
  if (formState.selectedStrategyIds.length === 0) {
    return
  }

  // Update store with form values
  backtestStore.setInvestmentAmount(formState.investmentAmount)
  // Format dates as ISO 8601 with time (required by backend)
  backtestStore.setDateRange(
    formState.startDate.startOf('day').toISOString(),
    formState.endDate.endOf('day').toISOString(),
  )

  // Build strategy configs (no parameters for MVP)
  const strategies = formState.selectedStrategyIds.map((id) =>
    backtestService.buildStrategyConfig(id),
  )
  backtestStore.setSelectedStrategies(strategies)

  // Run comparison
  await backtestStore.compareStrategies()

  // Navigate to results if successful
  if (backtestStore.hasResults) {
    router.push('/backtest/results')
  }
}

onMounted(() => {
  // Initialize form with store values
  formState.investmentAmount = backtestStore.investmentAmount
  formState.startDate = dayjs(backtestStore.startDate) as Dayjs
  formState.endDate = dayjs(backtestStore.endDate) as Dayjs
})
</script>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.strategy-selection-card {
  margin-top: 24px;
}

.strategy-selection-card h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>

