<template>
  <div class="user-management-view">
    <a-card>
      <template #title>
        <div class="page-header">
          <h1>User Management</h1>
          <a-button type="primary" @click="showCreateModal">
            <template #icon>
              <PlusOutlined />
            </template>
            Create User
          </a-button>
        </div>
      </template>

      <div class="search-bar">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="Search by email or name"
          style="max-width: 400px"
          @search="handleSearch"
          @pressEnter="handleSearch"
        />
      </div>

      <a-table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <a-tag :color="getRoleColor(record.role)">
              {{ formatRole(record.role) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">
                Edit
              </a-button>
              <a-popconfirm
                title="Are you sure you want to delete this user?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small">Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit User Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingUser ? 'Edit User' : 'Create User'"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="Email" name="email">
          <a-input v-model:value="formState.email" />
        </a-form-item>
        <a-form-item label="Name" name="name">
          <a-input v-model:value="formState.name" />
        </a-form-item>
        <a-form-item
          v-if="!editingUser"
          label="Password"
          name="password"
        >
          <a-input-password v-model:value="formState.password" />
        </a-form-item>
        <a-form-item
          v-if="editingUser"
          label="New Password (leave empty to keep current)"
          name="password"
        >
          <a-input-password v-model:value="formState.password" />
        </a-form-item>
        <a-form-item label="Role" name="role">
          <a-select v-model:value="formState.role">
            <a-select-option value="user">User</a-select-option>
            <a-select-option value="admin">Admin</a-select-option>
            <a-select-option value="master">Master</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { FormInstance } from 'ant-design-vue'
import { userManagementService } from '../services/userManagementService'
import type { User, UserRole } from '@/shared/types/auth'
import type { CreateUserRequest, UpdateUserRequest } from '../services/userManagementService'
import dayjs from 'dayjs'

const { t } = useI18n()

const loading = ref(false)
const users = ref<User[]>([])
const searchQuery = ref('')
const modalVisible = ref(false)
const editingUser = ref<User | null>(null)
const formRef = ref<FormInstance>()

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Total ${total} users`,
})

const formState = reactive<{
  email: string
  name: string
  password: string
  role: UserRole
}>({
  email: '',
  name: '',
  password: '',
  role: 'user',
})

const rules = {
  email: [
    { required: true, message: 'Please input email', trigger: 'blur' },
    { type: 'email', message: 'Please input a valid email', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Please input name', trigger: 'blur' },
    { min: 2, message: 'Name must be at least 2 characters', trigger: 'blur' },
  ],
  password: [
    {
      required: true,
      message: 'Please input password',
      trigger: 'blur',
      validator: (_rule: any, value: string) => {
        if (!editingUser.value && !value) {
          return Promise.reject('Please input password')
        }
        if (value && value.length < 8) {
          return Promise.reject('Password must be at least 8 characters')
        }
        return Promise.resolve()
      },
    },
  ],
  role: [{ required: true, message: 'Please select role', trigger: 'change' }],
}

const columns: ColumnsType = [
  {
    title: 'Email',
    key: 'email',
    dataIndex: 'email',
    sorter: true,
  },
  {
    title: 'Name',
    key: 'name',
    dataIndex: 'name',
    sorter: true,
  },
  {
    title: 'Role',
    key: 'role',
    dataIndex: 'role',
  },
  {
    title: 'Created At',
    key: 'createdAt',
    dataIndex: 'createdAt',
    sorter: true,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
  },
]

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await userManagementService.getUsers(
      pagination.current,
      pagination.pageSize,
      searchQuery.value || undefined,
    )
    users.value = response.data
    pagination.total = response.total
  } catch (error) {
    message.error('Failed to load users')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadUsers()
}

const showCreateModal = () => {
  editingUser.value = null
  formState.email = ''
  formState.name = ''
  formState.password = ''
  formState.role = 'user'
  modalVisible.value = true
}

const showEditModal = (user: User) => {
  editingUser.value = user
  formState.email = user.email
  formState.name = user.name
  formState.password = ''
  formState.role = user.role
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    if (editingUser.value) {
      const updateData: UpdateUserRequest = {
        email: formState.email,
        name: formState.name,
        role: formState.role,
      }
      if (formState.password) {
        updateData.password = formState.password
      }
      await userManagementService.updateUser(editingUser.value.id, updateData)
      message.success('User updated successfully')
    } else {
      const createData: CreateUserRequest = {
        email: formState.email,
        name: formState.name,
        password: formState.password,
        role: formState.role,
      }
      await userManagementService.createUser(createData)
      message.success('User created successfully')
    }
    
    modalVisible.value = false
    loadUsers()
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // Validation errors are handled by form
      return
    }
    message.error(error instanceof Error ? error.message : 'Failed to save user')
  }
}

const handleCancel = () => {
  modalVisible.value = false
  editingUser.value = null
  formRef.value?.resetFields()
}

const handleDelete = async (userId: string) => {
  try {
    await userManagementService.deleteUser(userId)
    message.success('User deleted successfully')
    loadUsers()
  } catch (error) {
    message.error('Failed to delete user')
    console.error(error)
  }
}

const formatRole = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    user: 'User',
    admin: 'Admin',
    master: 'Master',
  }
  return roleMap[role] || role
}

const getRoleColor = (role: UserRole): string => {
  const colorMap: Record<UserRole, string> = {
    user: 'blue',
    admin: 'orange',
    master: 'red',
  }
  return colorMap[role] || 'default'
}

const formatDate = (dateString: string): string => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>

