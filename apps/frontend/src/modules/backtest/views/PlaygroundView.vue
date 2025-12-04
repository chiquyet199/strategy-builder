<template>
  <div class="playground-view">
    <!-- Desktop: Split Layout -->
    <div class="desktop-layout">
      <!-- Left Side: Form -->
      <FormPanel />

      <!-- Right Side: Results -->
      <div class="results-panel">
        <ResultsPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FormPanel from '../components/FormPanel.vue'
import ResultsPanel from '../components/ResultsPanel.vue'
</script>

<style scoped>
.playground-view {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
}

/* Desktop Layout */
.desktop-layout {
  display: flex;
  height: 100%;
  width: 100%;
}

.results-panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f5f5f5;
}
</style>
