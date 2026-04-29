<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type RbacMethod = 'find' | 'get' | 'create' | 'update' | 'patch' | 'remove'
type RbacPolicies = Record<string, Partial<Record<RbacMethod, string[]>>>

interface RbacFile {
  enabled: boolean
  denyByDefault: boolean
  roles: string[]
  policies: RbacPolicies
  updatedAt?: string
}

const status = ref<any>(null)
const rbac = ref<RbacFile | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const okMsg = ref<string | null>(null)

const canWrite = computed(() => !!status.value?.consoleEnabled && !!status.value?.allowWrite)

async function loadAll() {
  loading.value = true
  error.value = null
  okMsg.value = null
  try {
    status.value = await $fetch('/api/nfz/status')
    const res: any = await $fetch('/api/nfz/rbac')
    rbac.value = res.file
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || String(e)
  }
  finally {
    loading.value = false
  }
}

function ensurePolicy(service: string) {
  if (!rbac.value)
    return
  rbac.value.policies ||= {}
  rbac.value.policies[service] ||= {}
}

function toggleRole(service: string, method: RbacMethod, role: string) {
  if (!rbac.value)
    return
  ensurePolicy(service)
  const cur = new Set((rbac.value.policies[service]?.[method] || []).map(String))
  if (cur.has(role))
    cur.delete(role)
  else cur.add(role)
  rbac.value.policies[service]![method] = [...cur]
}

async function save() {
  if (!rbac.value)
    return
  saving.value = true
  error.value = null
  okMsg.value = null
  try {
    await $fetch('/api/nfz/rbac', { method: 'POST', body: rbac.value })
    okMsg.value = 'RBAC enregistré.'
    await loadAll()
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || String(e)
  }
  finally {
    saving.value = false
  }
}

const services = computed(() => {
  const list: string[] = (status.value?.services?.list || status.value?.servicesList || []) as any
  // fallback: derive from existing policies
  const fromPolicies = rbac.value ? Object.keys(rbac.value.policies || {}) : []
  return Array.from(new Set([...(Array.isArray(list) ? list : []), ...fromPolicies])).sort()
})

const roleBadgeStyle = [
  'padding: 4px 10px',
  'border-radius: 999px',
  'border: 1px solid rgba(127,127,127,.4)',
].join('; ')

const methodHeaderStyle = [
  'text-align:left',
  'padding: 10px',
  'border-bottom: 1px solid rgba(127,127,127,.25)',
  'text-transform: uppercase',
  'font-size: 12px',
].join('; ')

const methods: RbacMethod[] = ['find', 'get', 'create', 'update', 'patch', 'remove']

onMounted(loadAll)
</script>

<template>
  <div style="padding: 16px; max-width: 1100px; margin: 0 auto;">
    <h1 style="font-size: 20px; font-weight: 700;">
      RBAC
    </h1>
    <p style="opacity: 0.8; margin: 6px 0 16px;">
      Mode: <b>{{ status?.authProvider || 'n/a' }}</b> —
      Source des rôles: <b>{{ status?.authProvider === 'keycloak' ? 'JWT (realm/client roles)' : 'user.roles' }}</b>
    </p>

    <div v-if="error" style="margin: 12px 0; padding: 10px; border: 1px solid #f00; border-radius: 8px;">
      {{ error }}
    </div>
    <div v-if="okMsg" style="margin: 12px 0; padding: 10px; border: 1px solid #0a0; border-radius: 8px;">
      {{ okMsg }}
    </div>

    <div v-if="loading">
      Chargement…
    </div>

    <div v-else-if="rbac">
      <div style="display:flex; gap: 12px; align-items:center; flex-wrap: wrap; margin: 10px 0 16px;">
        <label style="display:flex; gap:8px; align-items:center;">
          <input v-model="rbac.enabled" type="checkbox" :disabled="!canWrite" />
          <span>Activer RBAC</span>
        </label>
        <label style="display:flex; gap:8px; align-items:center;">
          <input v-model="rbac.denyByDefault" type="checkbox" :disabled="!canWrite" />
          <span>Deny-by-default</span>
        </label>

        <div style="flex: 1;"></div>

        <button :disabled="!canWrite || saving" style="padding: 8px 12px; border-radius: 8px;" @click="save">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>

      <div style="margin: 10px 0 18px;">
        <div style="font-weight:600; margin-bottom:8px;">
          Rôles
        </div>
        <div style="display:flex; gap: 8px; flex-wrap: wrap;">
          <span v-for="r in rbac.roles" :key="r" :style="roleBadgeStyle">
            {{ r }}
          </span>
        </div>
        <div style="opacity:0.7; margin-top:6px; font-size: 12px;">
          Fichier: services/.nfz/rbac.json — updatedAt: {{ rbac.updatedAt || 'n/a' }}
        </div>
      </div>

      <div v-if="services.length === 0" style="opacity: 0.8;">
        Aucun service détecté (ou aucune policy définie).
      </div>

      <div v-else style="overflow:auto; border: 1px solid rgba(127,127,127,.25); border-radius: 12px;">
        <table style="border-collapse: collapse; width: 100%; min-width: 860px;">
          <thead>
            <tr>
              <th style="text-align:left; padding: 10px; border-bottom: 1px solid rgba(127,127,127,.25);">
                Service
              </th>
              <th v-for="m in methods" :key="m" :style="methodHeaderStyle">
                {{ m }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in services" :key="s">
              <td style="padding: 10px; border-bottom: 1px solid rgba(127,127,127,.15); font-weight: 600;">
                {{ s }}
              </td>
              <td v-for="m in methods" :key="m" style="padding: 10px; border-bottom: 1px solid rgba(127,127,127,.15);">
                <div style="display:flex; gap:6px; flex-wrap: wrap;">
                  <button
                    v-for="r in rbac.roles"
                    :key="r"
                    :disabled="!canWrite"
                    :style="{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      border: '1px solid rgba(127,127,127,.35)',
                      opacity: (rbac.policies?.[s]?.[m] || []).includes(r) ? 1 : 0.4,
                    }"
                    @click="toggleRole(s, m, r)"
                  >
                    {{ r }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 14px; opacity: 0.75; font-size: 12px;">
        Note: si RBAC est activé, une policy manquante est refusée si deny-by-default est activé.
      </div>
    </div>
  </div>
</template>
