<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          What if you had invested differently?
        </h1>
        <p class="hero-subtitle">
          Compare crypto investment strategies with real historical data
        </p>
        <p class="hero-description">
          Test and compare trading strategies before risking real money. See how different approaches would have performed over time.
        </p>
        <a-button
          type="primary"
          size="large"
          class="cta-button"
          @click="goToPlayground"
        >
          Try It Now →
        </a-button>
      </div>
    </section>

    <!-- Video Placeholder Section -->
    <section class="video-section">
      <div class="video-container">
        <div class="video-placeholder">
          <div class="video-placeholder-content">
            <PlayCircleOutlined class="play-icon" />
            <p class="video-placeholder-text">Video comparison coming soon</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section (Optional) -->
    <section class="features-section">
      <div class="features-container">
        <div class="feature-card">
          <BarChartOutlined class="feature-icon" />
          <h3>Compare Strategies</h3>
          <p>See how different investment strategies perform side-by-side</p>
        </div>
        <div class="feature-card">
          <HistoryOutlined class="feature-icon" />
          <h3>Historical Data</h3>
          <p>Test with real market data from 2020 to present</p>
        </div>
        <div class="feature-card">
          <SafetyOutlined class="feature-icon" />
          <h3>Risk-Free</h3>
          <p>No real money required - test before you invest</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PlayCircleOutlined, BarChartOutlined, HistoryOutlined, SafetyOutlined } from '@ant-design/icons-vue'

const router = useRouter()

function goToPlayground() {
  router.push('/playground')
}
</script>

<style scoped>
.landing-page {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-section {
  padding: 120px 24px 80px;
  text-align: center;
  color: white;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.2;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  opacity: 0.95;
}

.hero-description {
  font-size: 1.125rem;
  margin-bottom: 40px;
  opacity: 0.9;
  line-height: 1.6;
}

.cta-button {
  height: 56px;
  padding: 0 48px;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.video-section {
  padding: 80px 24px;
  background: white;
}

.video-container {
  max-width: 1200px;
  margin: 0 auto;
}

.video-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d1d5db;
}

.video-placeholder-content {
  text-align: center;
  color: #6b7280;
}

.play-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #9ca3af;
}

.video-placeholder-text {
  font-size: 1.125rem;
  font-weight: 500;
}

.features-section {
  padding: 80px 24px;
  background: #f9fafb;
}

.features-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 48px;
  color: #667eea;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1f2937;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }

  .hero-description {
    font-size: 1rem;
  }

  .cta-button {
    width: 100%;
    max-width: 300px;
  }

  .features-container {
    grid-template-columns: 1fr;
  }
}
</style>
