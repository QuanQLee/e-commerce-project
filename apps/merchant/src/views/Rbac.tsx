import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import api from '../api'
import { getTenantId } from '../auth'

type Tenant = {
  id: number
  code: string
  name: string
  region: string
  plan: string
  status: string
}

type Role = {
  id: number
  tenant_id: number
  code: string
  name: string
  created_at: string
  updated_at: string
}

type RolePermissions = {
  role_id: number
  permissions: string[]
}

type UserPermissions = {
  user_id: string
  tenant_id: number
  roles: string[]
  permissions: string[]
}

type ToastState = { message: string; severity: 'success' | 'error' } | null

const PERMISSION_TEMPLATES: Array<{ code: string; label: string; permissions: string[] }> = [
  {
    code: 'catalog_admin',
    label: 'Catalog Admin',
    permissions: [
      'catalog.products.read',
      'catalog.products.write',
      'inventory.read',
      'inventory.write'
    ]
  },
  {
    code: 'order_ops',
    label: 'Order Operations',
    permissions: [
      'orders.read',
      'orders.write',
      'shipping.read',
      'shipping.write',
      'rma.read',
      'rma.write'
    ]
  },
  {
    code: 'marketing_ops',
    label: 'Marketing Operations',
    permissions: [
      'promotion.coupons.read',
      'promotion.coupons.write',
      'cms.read',
      'cms.write',
      'analytics.read'
    ]
  },
  {
    code: 'tenant_admin',
    label: 'Tenant Admin',
    permissions: [
      'tenant.rbac.manage',
      'users.read',
      'users.write'
    ]
  }
]

function normalizePermissions(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).sort()
}

function getErrorMessage(err: unknown, fallback: string): string {
  const responseMessage = (err as { response?: { data?: { detail?: string; message?: string; error?: string } } })
    ?.response?.data
  return responseMessage?.detail || responseMessage?.message || responseMessage?.error || fallback
}

export default function Rbac() {
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [roleCode, setRoleCode] = useState('')
  const [roleName, setRoleName] = useState('')
  const [cloneRoleCode, setCloneRoleCode] = useState('')
  const [cloneRoleName, setCloneRoleName] = useState('')
  const [permissionsInput, setPermissionsInput] = useState('')
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [inspectUserId, setInspectUserId] = useState('')
  const [inspectedUser, setInspectedUser] = useState<UserPermissions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const currentTenantCode = getTenantId() || ''

  const selectedRole = useMemo(
    () => roles.find((item) => item.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

  const loadRoles = useCallback(async (tenantId: number) => {
    setLoadingRoles(true)
    setError(null)
    try {
      const response = await api.get<Role[]>(`/api/v1/tenant/tenants/${tenantId}/rbac/roles`)
      const next = response.data || []
      setRoles(next)
      setSelectedRoleId((prev) => (prev && next.some((item) => item.id === prev) ? prev : (next[0]?.id ?? null)))
    } catch (err) {
      setRoles([])
      setSelectedRoleId(null)
      setError(getErrorMessage(err, 'Failed to load roles'))
    } finally {
      setLoadingRoles(false)
    }
  }, [])

  const loadRolePermissions = useCallback(async (tenantId: number, roleId: number) => {
    setLoadingRolePermissions(true)
    try {
      const response = await api.get<RolePermissions>(`/api/v1/tenant/tenants/${tenantId}/rbac/roles/${roleId}/permissions`)
      const current = response.data?.permissions || []
      setPermissionsInput(current.join('\n'))
    } catch (err) {
      setPermissionsInput('')
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to load role permissions') })
    } finally {
      setLoadingRolePermissions(false)
    }
  }, [])

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true)
    setError(null)
    try {
      const response = await api.get<Tenant[]>('/api/v1/tenant/tenants')
      const next = response.data || []
      setTenants(next)
      if (next.length === 0) {
        setSelectedTenantId(null)
        setRoles([])
        setSelectedRoleId(null)
        return
      }
      const byCode = next.find((tenant) => tenant.code === currentTenantCode)
      const tenantId = byCode?.id ?? next[0].id
      setSelectedTenantId(tenantId)
      await loadRoles(tenantId)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load tenants'))
    } finally {
      setLoadingTenants(false)
    }
  }, [currentTenantCode, loadRoles])

  useEffect(() => {
    void loadTenants()
  }, [loadTenants])

  useEffect(() => {
    if (!selectedTenantId || !selectedRoleId) {
      setPermissionsInput('')
      return
    }
    void loadRolePermissions(selectedTenantId, selectedRoleId)
  }, [loadRolePermissions, selectedRoleId, selectedTenantId])

  const handleChangeTenant = async (value: string) => {
    const nextTenantId = Number(value)
    if (!Number.isFinite(nextTenantId)) return
    setSelectedTenantId(nextTenantId)
    setInspectedUser(null)
    await loadRoles(nextTenantId)
  }

  const handleCreateRole = async () => {
    if (!selectedTenantId) return
    const code = roleCode.trim().toLowerCase()
    const name = roleName.trim()
    if (!code || !name) {
      setToast({ severity: 'error', message: 'Role code and name are required' })
      return
    }
    try {
      await api.post(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles`, { code, name })
      setRoleCode('')
      setRoleName('')
      await loadRoles(selectedTenantId)
      setToast({ severity: 'success', message: 'Role created' })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to create role') })
    }
  }

  const handleSetPermissions = async () => {
    if (!selectedTenantId || !selectedRoleId) return
    const permissions = normalizePermissions(permissionsInput)
    try {
      await api.put(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles/${selectedRoleId}/permissions`, { permissions })
      setPermissionsInput(permissions.join('\n'))
      setToast({
        severity: 'success',
        message: permissions.length ? `Saved ${permissions.length} permissions` : 'Cleared role permissions'
      })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to set permissions') })
    }
  }

  const applyTemplate = () => {
    const template = PERMISSION_TEMPLATES.find((item) => item.code === selectedTemplateCode)
    if (!template) return
    setPermissionsInput(template.permissions.join('\n'))
  }

  const handleCloneRole = async () => {
    if (!selectedTenantId || !selectedRoleId) return
    const code = cloneRoleCode.trim().toLowerCase()
    const name = cloneRoleName.trim()
    if (!code || !name) {
      setToast({ severity: 'error', message: 'Clone role code and name are required' })
      return
    }
    try {
      await api.post(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles/${selectedRoleId}/clone`, {
        code,
        name
      })
      setCloneRoleCode('')
      setCloneRoleName('')
      await loadRoles(selectedTenantId)
      setToast({ severity: 'success', message: 'Role cloned' })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to clone role') })
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedTenantId || !selectedRoleId) return
    const role = roles.find((item) => item.id === selectedRoleId)
    const ok = typeof window === 'undefined' ? true : window.confirm(`Delete role ${role?.code ?? selectedRoleId}?`)
    if (!ok) return
    try {
      await api.delete(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles/${selectedRoleId}`)
      await loadRoles(selectedTenantId)
      setToast({ severity: 'success', message: 'Role deleted' })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to delete role') })
    }
  }

  const handleAssign = async () => {
    if (!selectedTenantId || !selectedRoleId) return
    const userId = assignUserId.trim()
    if (!userId) {
      setToast({ severity: 'error', message: 'User ID is required' })
      return
    }
    try {
      await api.post(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles/${selectedRoleId}/assign`, { user_id: userId })
      setToast({ severity: 'success', message: 'Role assigned to user' })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to assign role') })
    }
  }

  const handleUnassign = async () => {
    if (!selectedTenantId || !selectedRoleId) return
    const userId = assignUserId.trim()
    if (!userId) {
      setToast({ severity: 'error', message: 'User ID is required' })
      return
    }
    try {
      await api.delete(`/api/v1/tenant/tenants/${selectedTenantId}/rbac/roles/${selectedRoleId}/assign/${encodeURIComponent(userId)}`)
      setToast({ severity: 'success', message: 'Role unassigned from user' })
    } catch (err) {
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to unassign role') })
    }
  }

  const handleInspectPermissions = async () => {
    if (!selectedTenantId) return
    const userId = inspectUserId.trim()
    if (!userId) {
      setToast({ severity: 'error', message: 'User ID is required' })
      return
    }
    try {
      const response = await api.get<UserPermissions>(
        `/api/v1/tenant/tenants/${selectedTenantId}/rbac/users/${encodeURIComponent(userId)}/permissions`
      )
      setInspectedUser(response.data)
      setToast({ severity: 'success', message: 'Loaded user permissions' })
    } catch (err) {
      setInspectedUser(null)
      setToast({ severity: 'error', message: getErrorMessage(err, 'Failed to fetch user permissions') })
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          RBAC
        </Typography>
        <Typography color="text.secondary">
          Manage tenant roles, permission sets, and user-role assignments.
        </Typography>
      </Box>

      {(loadingTenants || loadingRoles) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Tenant
            </Typography>
            <TextField
              select
              label="Current tenant"
              value={selectedTenantId ? String(selectedTenantId) : ''}
              onChange={(event) => void handleChangeTenant(event.target.value)}
              fullWidth
              disabled={tenants.length === 0}
            >
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={String(tenant.id)}>
                  {tenant.name} ({tenant.code}) - {tenant.region}
                </MenuItem>
              ))}
            </TextField>
            {tenants.length === 0 && (
              <Alert severity="warning">No tenant found. Create tenant data first.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Roles
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Role code"
                value={roleCode}
                onChange={(event) => setRoleCode(event.target.value)}
                fullWidth
              />
              <TextField
                label="Role name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={() => void handleCreateRole()} disabled={!selectedTenantId}>
                Create role
              </Button>
            </Stack>

            <TextField
              select
              label="Selected role"
              value={selectedRoleId ? String(selectedRoleId) : ''}
              onChange={(event) => setSelectedRoleId(Number(event.target.value))}
              fullWidth
              disabled={roles.length === 0}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={String(role.id)}>
                  {role.name} ({role.code})
                </MenuItem>
              ))}
            </TextField>

            {selectedRole && (
              <Typography variant="body2" color="text.secondary">
                Role: {selectedRole.name} ({selectedRole.code}), updated at {selectedRole.updated_at}
              </Typography>
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Clone role code"
                value={cloneRoleCode}
                onChange={(event) => setCloneRoleCode(event.target.value)}
                fullWidth
                disabled={!selectedRoleId}
              />
              <TextField
                label="Clone role name"
                value={cloneRoleName}
                onChange={(event) => setCloneRoleName(event.target.value)}
                fullWidth
                disabled={!selectedRoleId}
              />
              <Button variant="outlined" onClick={() => void handleCloneRole()} disabled={!selectedRoleId}>
                Clone role
              </Button>
              <Button variant="outlined" color="error" onClick={() => void handleDeleteRole()} disabled={!selectedRoleId}>
                Delete role
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter one permission per line, or comma separated. This will overwrite the role permission set.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                select
                label="Permission template"
                value={selectedTemplateCode}
                onChange={(event) => setSelectedTemplateCode(event.target.value)}
                fullWidth
              >
                {PERMISSION_TEMPLATES.map((template) => (
                  <MenuItem key={template.code} value={template.code}>
                    {template.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={applyTemplate} disabled={!selectedTemplateCode}>
                Apply template
              </Button>
            </Stack>
            <TextField
              label="Permissions"
              value={permissionsInput}
              onChange={(event) => setPermissionsInput(event.target.value)}
              placeholder="catalog.products.read&#10;catalog.products.write"
              multiline
              minRows={5}
              fullWidth
              disabled={!selectedRoleId || loadingRolePermissions}
            />
            <Button
              variant="contained"
              onClick={() => void handleSetPermissions()}
              disabled={!selectedRoleId || loadingRolePermissions}
            >
              {loadingRolePermissions ? 'Loading role permissions...' : 'Save permissions'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              User Assignment
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="User ID"
                value={assignUserId}
                onChange={(event) => setAssignUserId(event.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={() => void handleAssign()} disabled={!selectedRoleId}>
                Assign
              </Button>
              <Button variant="outlined" color="warning" onClick={() => void handleUnassign()} disabled={!selectedRoleId}>
                Unassign
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              User Permission Check
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="User ID"
                value={inspectUserId}
                onChange={(event) => setInspectUserId(event.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={() => void handleInspectPermissions()} disabled={!selectedTenantId}>
                Query permissions
              </Button>
            </Stack>
            {inspectedUser && (
              <>
                <Divider />
                <Typography variant="body2">
                  Roles: {inspectedUser.roles.length > 0 ? inspectedUser.roles.join(', ') : '(none)'}
                </Typography>
                <Typography variant="body2">
                  Permissions: {inspectedUser.permissions.length > 0 ? inspectedUser.permissions.join(', ') : '(none)'}
                </Typography>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.message ?? ''}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
