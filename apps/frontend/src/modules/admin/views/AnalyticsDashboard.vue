<template>
  <div class="analytics-dashboard">
    <a-card>
      <template #title>
        <div class="dashboard-header">
          <h1>Analytics Dashboard</h1>
          <a-space>
            <a-range-picker
              v-model:value="dateRange"
              format="YYYY-MM-DD"
              @change="handleDateRangeChange"
            />
            <a-button type="primary" :loading="analyticsStore.isLoading" @click="handleRefresh">
              Refresh
            </a-button>
          </a-space>
        </div>
      </template>

      <div v-if="analyticsStore.isLoading && !analyticsStore.dashboardStats" class="loading-container">
        <a-spin size="large" tip="Loading analytics...">
          <div style="height: 400px"></div>
        </a-spin>
      </div>

      <div v-else-if="analyticsStore.error" class="error-container">
        <a-alert
          :message="analyticsStore.error"
          type="error"
          show-icon
          closable
          @close="analyticsStore.error = null"
        />
      </div>

      <div v-else>
        <!-- Overview Cards -->
        <a-row :gutter="16" style="margin-bottom: 24px">
          <a-col :xs="24" :sm="12" :md="6">
            <a-statistic
              title="Total Comparisons"
              :value="analyticsStore.dashboardStats?.totalComparisons || 0"
              :value-style="{ color: '#3f8600' }"
            />
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-statistic
              title="Unique Strategies"
              :value="analyticsStore.dashboardStats?.uniqueStrategies || 0"
            />
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-statistic
              title="Avg Best Return"
              :value="formatPercentage(analyticsStore.dashboardStats?.avgBestReturn || 0)"
              :value-style="{ color: '#3f8600' }"
            />
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-statistic
              title="Most Popular"
              :value="formatStrategyName(analyticsStore.dashboardStats?.mostPopularStrategy || 'N/A')"
            />
          </a-col>
        </a-row>

        <!-- Tabs -->
        <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
          <a-tab-pane key="popular" tab="Popular Strategies">
            <a-table
              :columns="popularColumns"
              :data-source="analyticsStore.popularStrategies"
              :loading="analyticsStore.isLoading"
              :pagination="{ pageSize: 10 }"
              row-key="strategyId"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'strategyId'">
                  {{ formatStrategyName(record.strategyId) }}
                </template>
                <template v-else-if="column.key === 'avgReturn'">
                  <span :class="getReturnClass(record.avgReturn)">
                    {{ formatPercentage(record.avgReturn) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'maxReturn'">
                  <span :class="getReturnClass(record.maxReturn)">
                    {{ formatPercentage(record.maxReturn) }}
                  </span>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="top-performing" tab="Top Performers">
            <a-table
              :columns="topPerformingColumns"
              :data-source="analyticsStore.topPerforming"
              :loading="analyticsStore.isLoading"
              :pagination="{ pageSize: 10 }"
              row-key="strategyId"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'strategyName'">
                  {{ record.variantName || record.strategyName }}
                </template>
                <template v-else-if="column.key === 'totalReturn'">
                  <span :class="getReturnClass(record.totalReturn)">
                    {{ formatPercentage(record.totalReturn) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'finalValue'">
                  ${{ formatNumber(record.finalValue) }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDate(record.createdAt) }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="recent" tab="Recent Activity">
            <a-table
              :columns="recentColumns"
              :data-source="analyticsStore.recentComparisons"
              :loading="analyticsStore.isLoading"
              :pagination="{ pageSize: 10 }"
              row-key="id"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'strategies'">
                  <a-tag v-for="strategy in record.strategies" :key="strategy" style="margin-right: 4px">
                    {{ formatStrategyName(strategy) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'bestReturn'">
                  <span :class="getReturnClass(record.bestReturn)">
                    {{ formatPercentage(record.bestReturn) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTime(record.createdAt) }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="shared" tab="Shared Comparisons">
            <a-table
              :columns="sharedColumns"
              :data-source="analyticsStore.sharedComparisons"
              :loading="analyticsStore.isLoading"
              :pagination="{ pageSize: 10 }"
              row-key="shortCode"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'shortCode'">
                  <a :href="`/s/${record.shortCode}`" target="_blank">
                    /s/{{ record.shortCode }}
                  </a>
                </template>
                <template v-else-if="column.key === 'lastViewedAt'">
                  {{ record.lastViewedAt ? formatDateTime(record.lastViewedAt) : 'Never' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTime(record.createdAt) }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useAnalyticsStore } from '../stores/analyticsStore'
import type { ColumnsType } from 'ant-design-vue/es/table'

const { t } = useI18n()
const analyticsStore = useAnalyticsStore()

const activeTab = ref('popular')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const popularColumns: ColumnsType = [
  {
    title: 'Strategy',
    key: 'strategyId',
    dataIndex: 'strategyId',
  },
  {
    title: 'Usage Count',
    key: 'count',
    dataIndex: 'count',
    sorter: (a: any, b: any) => a.count - b.count,
  },
  {
    title: 'Avg Return',
    key: 'avgReturn',
    dataIndex: 'avgReturn',
    sorter: (a: any, b: any) => a.avgReturn - b.avgReturn,
  },
  {
    title: 'Max Return',
    key: 'maxReturn',
    dataIndex: 'maxReturn',
    sorter: (a: any, b: any) => a.maxReturn - b.maxReturn,
  },
]

const topPerformingColumns: ColumnsType = [
  {
    title: 'Strategy',
    key: 'strategyName',
    dataIndex: 'strategyName',
  },
  {
    title: 'Return',
    key: 'totalReturn',
    dataIndex: 'totalReturn',
    sorter: (a: any, b: any) => a.totalReturn - b.totalReturn,
  },
  {
    title: 'Final Value',
    key: 'finalValue',
    dataIndex: 'finalValue',
    sorter: (a: any, b: any) => a.finalValue - b.finalValue,
  },
  {
    title: 'Date',
    key: 'createdAt',
    dataIndex: 'createdAt',
    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
]

const recentColumns: ColumnsType = [
  {
    title: 'Strategies',
    key: 'strategies',
    dataIndex: 'strategies',
  },
  {
    title: 'Date Range',
    key: 'dateRange',
    render: (record: any) => `${record.startDate} - ${record.endDate}`,
  },
  {
    title: 'Best Return',
    key: 'bestReturn',
    dataIndex: 'bestReturn',
    sorter: (a: any, b: any) => a.bestReturn - b.bestReturn,
  },
  {
    title: 'Created At',
    key: 'createdAt',
    dataIndex: 'createdAt',
    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
]

const sharedColumns: ColumnsType = [
  {
    title: 'Short Code',
    key: 'shortCode',
    dataIndex: 'shortCode',
  },
  {
    title: 'Views',
    key: 'viewCount',
    dataIndex: 'viewCount',
    sorter: (a: any, b: any) => a.viewCount - b.viewCount,
  },
  {
    title: 'Last Viewed',
    key: 'lastViewedAt',
    dataIndex: 'lastViewedAt',
  },
  {
    title: 'Created',
    key: 'createdAt',
    dataIndex: 'createdAt',
    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
]

const handleDateRangeChange = () => {
  loadCurrentTab()
}

const handleTabChange = (key: string) => {
  loadTabData(key)
}

const handleRefresh = async () => {
  try {
    const startDate = dateRange.value?.[0]?.format('YYYY-MM-DD')
    const endDate = dateRange.value?.[1]?.format('YYYY-MM-DD')
    await analyticsStore.refreshAll(startDate, endDate)
    message.success('Analytics refreshed successfully')
  } catch (error) {
    message.error('Failed to refresh analytics')
  }
}

const loadTabData = async (tab: string) => {
  const startDate = dateRange.value?.[0]?.format('YYYY-MM-DD')
  const endDate = dateRange.value?.[1]?.format('YYYY-MM-DD')

  try {
    switch (tab) {
      case 'popular':
        await analyticsStore.loadPopularStrategies(10, startDate, endDate)
        break
      case 'top-performing':
        await analyticsStore.loadTopPerforming(10, startDate, endDate)
        break
      case 'recent':
        await analyticsStore.loadRecentComparisons(20)
        break
      case 'shared':
        await analyticsStore.loadSharedComparisons(10)
        break
    }
  } catch (error) {
    // Error is handled by store
  }
}

const loadCurrentTab = () => {
  loadTabData(activeTab.value)
}

const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '0.00%'
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) {
    return '0.00%'
  }
  return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatDate = (dateString: string): string => {
  return dayjs(dateString).format('YYYY-MM-DD')
}

const formatDateTime = (dateString: string): string => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

const formatStrategyName = (strategyId: string): string => {
  const strategyNames: Record<string, string> = {
    'lump-sum': 'Lump Sum',
    'dca': 'DCA',
    'rsi-dca': 'RSI DCA',
    'dip-buyer-dca': 'Dip Buyer DCA',
    'moving-average-dca': 'Moving Average DCA',
    'combined-smart-dca': 'Combined Smart DCA',
    'rebalancing': 'Rebalancing',
  }
  return strategyNames[strategyId] || strategyId
}

const getReturnClass = (returnValue: number): string => {
  return returnValue >= 0 ? 'positive-value' : 'negative-value'
}

onMounted(async () => {
  try {
    // Load dashboard stats first
    await analyticsStore.loadDashboard()
    // Load current tab data
    await loadCurrentTab()
  } catch (error) {
    // Error is handled by store
  }
})
</script>

<style scoped>
.analytics-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.loading-container,
.error-container {
  text-align: center;
  padding: 48px;
}

.positive-value {
  color: #52c41a;
  font-weight: 600;
}

.negative-value {
  color: #f5222d;
  font-weight: 600;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

