<template>
  <a-layout-header class="navigation-header">
    <div class="nav-container">
      <div class="nav-logo">
        <router-link to="/" class="logo-link">
          <span class="logo-text">What-if-crypto</span>
        </router-link>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="horizontal"
        theme="dark"
        class="nav-menu"
        @click="handleMenuClick"
      >
        <a-menu-item key="playground">
          <router-link to="/playground">Playground</router-link>
        </a-menu-item>
        <a-menu-item v-if="authStore.isAdmin" key="admin-analytics">
          <router-link to="/admin/analytics">Analytics</router-link>
        </a-menu-item>
        <a-menu-item v-if="authStore.isAdmin" key="user-management">
          <router-link to="/admin/users">Users</router-link>
        </a-menu-item>
      </a-menu>
      <div class="nav-actions">
        <a-dropdown v-if="authStore.isAuthenticated" placement="bottomRight">
          <a-button type="text" class="user-menu-button">
            <UserOutlined />
            <span class="user-name">{{ authStore.user?.name || 'User' }}</span>
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="profile">
                <router-link to="/profile">
                  <UserOutlined />
                  Profile
                </router-link>
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="logout" @click="handleLogout">
                <LogoutOutlined />
                Logout
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-space v-else>
          <router-link to="/login">
            <a-button type="text" class="login-button">Login</a-button>
          </router-link>
          <router-link to="/register">
            <a-button type="primary">Sign Up</a-button>
          </router-link>
        </a-space>
      </div>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { UserOutlined, DownOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import { authService } from '@/modules/auth/services/authService'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const selectedKeys = ref<string[]>([])

// Update selected key based on current route
const updateSelectedKey = () => {
  const path = route.path
  if (path.startsWith('/playground')) {
    selectedKeys.value = ['playground']
  } else if (path === '/admin/analytics') {
    selectedKeys.value = ['admin-analytics']
  } else if (path === '/admin/users') {
    selectedKeys.value = ['user-management']
  } else {
    selectedKeys.value = []
  }
}

watch(() => route.path, updateSelectedKey, { immediate: true })

const handleMenuClick = ({ key }: { key: string }) => {
  selectedKeys.value = [key]
}

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}
</script>

<style scoped>
.navigation-header {
  background: #001529;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.nav-container {
  display: flex;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
}

.nav-logo {
  margin-right: 48px;
}

.logo-link {
  color: #fff;
  text-decoration: none;
  font-size: 18px;
  font-weight: 600;
}

.logo-text {
  color: #fff;
}

.nav-menu {
  flex: 1;
  background: transparent;
  border-bottom: none;
  line-height: 64px;
}

.nav-menu :deep(.ant-menu-item) {
  color: rgba(255, 255, 255, 0.65);
}

.nav-menu :deep(.ant-menu-item-selected) {
  color: #fff;
}

.nav-menu :deep(.ant-menu-item a) {
  color: inherit;
}

.nav-actions {
  margin-left: auto;
}

.user-menu-button {
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  color: rgba(255, 255, 255, 0.85);
}

.login-button {
  color: rgba(255, 255, 255, 0.85);
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
  }

  .nav-logo {
    margin-right: 16px;
  }

  .logo-text {
    font-size: 16px;
  }

  .nav-menu {
    display: none;
  }
}
</style>

