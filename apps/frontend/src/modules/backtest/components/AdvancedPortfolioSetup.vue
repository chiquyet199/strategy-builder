<template>
  <a-modal
    :visible="visible"
    :title="t('backtest.form.advancedPortfolio.title')"
    :width="600"
    :ok-text="t('backtest.form.advancedPortfolio.useThisSetup')"
    :cancel-text="t('backtest.form.advancedPortfolio.cancel')"
    @ok="handleUseSetup"
    @cancel="handleCancel"
  >
    <div class="advanced-portfolio-setup">
      <a-alert
        :message="t('backtest.form.advancedPortfolio.description')"
        type="info"
        show-icon
        style="margin-bottom: 24px"
      />

      <a-form :model="localPortfolio" layout="vertical">
        <!-- Assets Section -->
        <a-form-item :label="t('backtest.form.advancedPortfolio.assets.label')">
          <template #extra>
            <span class="helper-text">{{ t('backtest.form.advancedPortfolio.assets.helper') }}</span>
          </template>

          <div v-for="(asset, index) in localPortfolio.assets" :key="index" class="asset-row">
            <a-select
              v-model:value="asset.symbol"
              style="width: 150px"
              :options="availableAssets"
            />
            <a-input-number
              v-model:value="asset.quantity"
              :min="0"
              :step="0.00000001"
              :precision="8"
              style="flex: 1; margin-left: 8px"
              :placeholder="t('backtest.form.advancedPortfolio.assets.quantityPlaceholder')"
            />
            <a-button
              type="text"
              danger
              style="margin-left: 8px"
              @click="removeAsset(index)"
            >
              {{ t('backtest.form.advancedPortfolio.assets.remove') }}
            </a-button>
          </div>

          <a-button
            type="dashed"
            block
            style="margin-top: 8px"
            @click="addAsset"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            {{ t('backtest.form.advancedPortfolio.assets.add') }}
          </a-button>
        </a-form-item>

        <!-- USDC Amount -->
        <a-form-item :label="t('backtest.form.advancedPortfolio.usdcAmount.label')">
          <template #extra>
            <span class="helper-text">{{ t('backtest.form.advancedPortfolio.usdcAmount.helper') }}</span>
          </template>
          <a-input-number
            v-model:value="localPortfolio.usdcAmount"
            :min="0"
            :step="100"
            :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
            style="width: 100%"
          />
        </a-form-item>

        <!-- Preview -->
        <a-divider />
        <div class="preview-section">
          <h4>{{ t('backtest.form.advancedPortfolio.preview.title') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item :label="t('backtest.form.advancedPortfolio.preview.assets')">
              <div v-if="localPortfolio.assets.length === 0" style="color: #8c8c8c;">
                {{ t('backtest.form.advancedPortfolio.preview.noAssets') }}
              </div>
              <div v-else>
                <div v-for="(asset, index) in localPortfolio.assets" :key="index">
                  {{ asset.quantity }} {{ asset.symbol }}
                </div>
              </div>
            </a-descriptions-item>
            <a-descriptions-item :label="t('backtest.form.advancedPortfolio.preview.usdc')">
              ${{ localPortfolio.usdcAmount.toLocaleString() }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="handleCancel">
        {{ t('backtest.form.advancedPortfolio.cancel') }}
      </a-button>
      <a-button type="text" @click="handleResetToSimple">
        {{ t('backtest.form.advancedPortfolio.resetToSimple') }}
      </a-button>
      <a-button type="primary" @click="handleUseSetup">
        {{ t('backtest.form.advancedPortfolio.useThisSetup') }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { InitialPortfolio, Asset } from '@/shared/types/backtest'

interface Props {
  visible: boolean
  initialPortfolio?: InitialPortfolio
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'update:initial-portfolio', value: InitialPortfolio | undefined): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

// Available assets (for now, only BTC - extensible for future)
const availableAssets = computed(() => [
  { label: 'BTC', value: 'BTC' },
  // Future: Add more assets here
])

// Local portfolio state
const localPortfolio = ref<InitialPortfolio>({
  assets: [],
  usdcAmount: 0,
})

// Watch for prop changes
watch(
  () => props.initialPortfolio,
  (newPortfolio) => {
    if (newPortfolio) {
      localPortfolio.value = {
        assets: [...newPortfolio.assets],
        usdcAmount: newPortfolio.usdcAmount,
      }
    } else {
      localPortfolio.value = {
        assets: [],
        usdcAmount: 0,
      }
    }
  },
  { immediate: true }
)

// Watch for visible changes to reset when opening
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible && props.initialPortfolio) {
      localPortfolio.value = {
        assets: [...props.initialPortfolio.assets],
        usdcAmount: props.initialPortfolio.usdcAmount,
      }
    }
  }
)

function addAsset() {
  localPortfolio.value.assets.push({
    symbol: 'BTC',
    quantity: 0,
  })
}

function removeAsset(index: number) {
  localPortfolio.value.assets.splice(index, 1)
}

function handleUseSetup() {
  // Validate: at least one asset or USDC amount > 0
  const hasAssets = localPortfolio.value.assets.length > 0
  const hasUsdc = localPortfolio.value.usdcAmount > 0

  if (!hasAssets && !hasUsdc) {
    // If empty, don't set advanced portfolio (use simple mode)
    emit('update:initial-portfolio', undefined)
  } else {
    // Filter out assets with quantity 0
    const validAssets = localPortfolio.value.assets.filter((a) => a.quantity > 0)
    emit('update:initial-portfolio', {
      assets: validAssets,
      usdcAmount: localPortfolio.value.usdcAmount || 0,
    })
  }

  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}

function handleResetToSimple() {
  emit('update:initial-portfolio', undefined)
  emit('update:visible', false)
}
</script>

<style scoped>
.advanced-portfolio-setup {
  padding: 8px 0;
}

.asset-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.preview-section {
  margin-top: 16px;
}

.preview-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.helper-text {
  font-size: 12px;
  color: #8c8c8c;
}
</style>

