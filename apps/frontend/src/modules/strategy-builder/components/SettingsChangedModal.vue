<template>
  <a-modal
    v-model:open="visible"
    title="Preview Settings Changed"
    :z-index="1003"
    :footer="null"
    @cancel="$emit('cancel')"
  >
    <div class="settings-changed-content">
      <p class="description">
        You tested the strategy with different settings than the main form:
      </p>

      <div class="changes-box">
        <div v-if="changes.dateChanged" class="change-row">
          <span class="change-label">Time Period:</span>
          <div class="change-values">
            <div class="new-value">{{ changes.newDateRange }}</div>
            <div class="old-value">was: {{ changes.originalDateRange }}</div>
          </div>
        </div>
        <div v-if="changes.timeframeChanged" class="change-row">
          <span class="change-label">Timeframe:</span>
          <div class="change-values">
            <div class="new-value">{{ formatTimeframe(changes.newTimeframe) }}</div>
            <div class="old-value">was: {{ formatTimeframe(changes.originalTimeframe) }}</div>
          </div>
        </div>
      </div>

      <div class="warning-box">
        <ExclamationCircleOutlined class="warning-icon" />
        <span>
          If you keep the original settings, the backtest results may differ from what you previewed.
        </span>
      </div>
    </div>

    <div class="modal-footer">
      <a-button @click="$emit('cancel')">Keep Original</a-button>
      <a-button type="primary" @click="$emit('confirm')">
        Update Form Settings
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Modal as AModal, Button as AButton } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'

interface Changes {
  dateChanged: boolean
  timeframeChanged: boolean
  originalDateRange?: string
  newDateRange?: string
  originalTimeframe?: string
  newTimeframe?: string
}

interface Props {
  open: boolean
  changes: Changes
}

const props = defineProps<Props>()

defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const visible = computed({
  get: () => props.open,
  set: (value) => {
    // handled by parent
  },
})

function formatTimeframe(tf: string | undefined): string {
  if (!tf) return ''
  const map: Record<string, string> = {
    '1h': 'Hourly (1H)',
    '4h': '4 Hours (4H)',
    '1d': 'Daily (1D)',
    '1w': 'Weekly (1W)',
    '1m': 'Monthly (1M)',
  }
  return map[tf.toLowerCase()] || tf
}
</script>

<style scoped>
.settings-changed-content {
  padding: 8px 0;
}

.description {
  color: #666;
  margin-bottom: 16px;
}

.changes-box {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.change-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.change-row:last-child {
  margin-bottom: 0;
}

.change-label {
  color: #666;
  min-width: 100px;
  font-size: 13px;
}

.change-values {
  flex: 1;
}

.new-value {
  color: #52c41a;
  font-weight: 500;
}

.old-value {
  color: #999;
  font-size: 12px;
  text-decoration: line-through;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  color: #d48806;
  font-size: 13px;
}

.warning-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
