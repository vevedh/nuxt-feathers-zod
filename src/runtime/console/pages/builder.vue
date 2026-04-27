<script setup lang="ts">
interface FieldMeta { type: string, required?: boolean, array?: boolean }
interface ServiceItem { name: string, source: 'manifest' | 'scan' }

interface SchemaInfo {
  service: string
  schemaFile: string
  manifestPath: string | null
  adapter?: string
  auth?: boolean
  docs?: boolean
  idField?: string
  collection?: string
  fields: Record<string, FieldMeta>
  schemaFields: Record<string, FieldMeta>
  manifestFields: Record<string, FieldMeta> | null
  drift: boolean
  driftDetail: { onlyInManifest: string[], onlyInSchema: string[], changed: string[] }
}

const typeOptions = ['string', 'number', 'int', 'boolean', 'date', 'objectId', 'json']

const selected = ref<string>('')

const route = useRoute()
const router = useRouter()

const { data: servicesData, refresh: refreshServices } = await useFetch('/api/nfz/services')
const services = computed<ServiceItem[]>(() => ((servicesData.value as any)?.services ?? []) as ServiceItem[])
const serviceNames = computed(() => services.value.map(s => s.name))

watch(services, (list) => {
  const names = Array.isArray(list) ? list.map(s => s.name) : []
  if (selected.value || !names.length)
    return

  // 1) URL param ?service=
  const q = route.query.service
  if (typeof q === 'string' && names.includes(q)) {
    selected.value = q
    return
  }

  // 2) last used (client only)
  if (import.meta.client) {
    const last = localStorage.getItem('nfz.builder.service')
    if (last && names.includes(last)) {
      selected.value = last
      return
    }
  }

  // 3) first service
  selected.value = names[0]
}, { immediate: true })

const info = ref<SchemaInfo | null>(null)
const draft = ref<Record<string, FieldMeta>>({})
const newField = reactive({ name: '', type: 'string', required: true, array: false })

async function load() {
  if (!selected.value)
    return
  const { data, error } = await useFetch<SchemaInfo>(`/api/nfz/schema/${selected.value}`, { key: `schema-${selected.value}` })
  if (error.value)
    throw error.value
  info.value = data.value as any
  draft.value = JSON.parse(JSON.stringify((data.value as any)?.fields ?? {}))
}

watch(selected, () => { load() }, { immediate: true })

watch(selected, (val) => {
  if (!val)
    return
  if (import.meta.client) {
    localStorage.setItem('nfz.builder.service', val)
  }
  // keep URL shareable
  if (import.meta.client) {
    const q = route.query.service
    if (q !== val) {
      router.replace({ query: { ...route.query, service: val } })
    }
  }
})

function addField() {
  const name = newField.name.trim()
  if (!name)
    return
  if (draft.value[name])
    return
  draft.value[name] = { type: newField.type, required: !!newField.required, array: !!newField.array }
  newField.name = ''
  newField.type = 'string'
  newField.required = true
  newField.array = false
}

function removeField(name: string) {
  const copy = { ...draft.value }
  delete copy[name]
  draft.value = copy
}

const busy = ref(false)
const lastResult = ref<any>(null)
const lastDiff = ref<any>(null)
const errorMsg = ref<string>('')

const drift = computed(() => !!info.value?.drift)
const driftDetail = computed(() => info.value?.driftDetail ?? { onlyInManifest: [], onlyInSchema: [], changed: [] })

async function sync(mode: 'manifest-to-schema' | 'schema-to-manifest', dryRun = false) {
  errorMsg.value = ''
  busy.value = true
  try {
    const res = await $fetch(`/api/nfz/schema/${selected.value}`, {
      method: 'POST',
      body: { sync: mode, dryRun },
    })
    if (dryRun) {
      lastDiff.value = res
    }
    else {
      lastResult.value = res
      await load()
      // align draft with new effective fields
      if (info.value)
        draft.value = JSON.parse(JSON.stringify(info.value.fields))
    }
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || String(e)
  }
  finally {
    busy.value = false
  }
}

async function apply() {
  errorMsg.value = ''
  lastResult.value = null
  busy.value = true
  try {
    const res = await $fetch(`/api/nfz/schema/${selected.value}`, {
      method: 'POST',
      body: { fields: draft.value },
    })
    lastResult.value = res
    await load()
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || String(e)
  }
  finally {
    busy.value = false
  }
}

async function diff() {
  errorMsg.value = ''
  lastDiff.value = null
  busy.value = true
  try {
    const res = await $fetch(`/api/nfz/schema/${selected.value}`, {
      method: 'POST',
      body: { fields: draft.value, dryRun: true },
    })
    lastDiff.value = res
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || String(e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>Schema Builder</h1>
      <p class="sub">
        Édite les champs d’un service Feathers (Zod) et applique la modification au schema + manifest.
      </p>
    </header>

    <section class="card">
      <div class="row">
        <label class="label">Service</label>
        <select v-model="selected" class="select">
          <option v-for="s in services" :key="s.name" :value="s.name">
            {{ s.name }} [{{ s.source }}]
          </option>
        </select>

        <button class="btn" @click="refreshServices()">
          Refresh
        </button>
      </div>

      <div v-if="info" class="meta">
        <div class="metaTop">
          <div><b>schemaFile</b> <code>{{ info.schemaFile }}</code></div>
          <div><b>manifest</b> <code>{{ info.manifestPath || '(absent)' }}</code></div>
          <div>
            <b>drift</b>
            <span v-if="drift" class="badge warn">⚠ drift</span>
            <span v-else class="badge ok">ok</span>
          </div>
        </div>
        <div class="metaGrid">
          <div><b>adapter</b> {{ info.adapter || '-' }}</div>
          <div><b>auth</b> {{ info.auth ? 'on' : 'off' }}</div>
          <div><b>docs</b> {{ info.docs ? 'on' : 'off' }}</div>
          <div><b>idField</b> {{ info.idField || '-' }}</div>
          <div><b>collection</b> {{ info.collection || '-' }}</div>
        </div>

        <div v-if="drift" class="driftBox">
          <div class="driftTitle">
            Manifest ≠ Schema.ts
          </div>
          <div class="driftCols">
            <div>
              <div class="driftLbl">
                only in manifest
              </div>
              <code v-if="driftDetail.onlyInManifest.length">{{ driftDetail.onlyInManifest.join(', ') }}</code>
              <span v-else class="muted">(none)</span>
            </div>
            <div>
              <div class="driftLbl">
                only in schema.ts
              </div>
              <code v-if="driftDetail.onlyInSchema.length">{{ driftDetail.onlyInSchema.join(', ') }}</code>
              <span v-else class="muted">(none)</span>
            </div>
            <div>
              <div class="driftLbl">
                changed
              </div>
              <code v-if="driftDetail.changed.length">{{ driftDetail.changed.join(', ') }}</code>
              <span v-else class="muted">(none)</span>
            </div>
          </div>

          <div class="driftActions">
            <button class="btn" :disabled="busy" @click="sync('manifest-to-schema', true)">
              Diff sync manifest → schema
            </button>
            <button class="btn" :disabled="busy" @click="sync('schema-to-manifest', true)">
              Diff sync schema → manifest
            </button>
            <button class="btn primary" :disabled="busy" @click="sync('manifest-to-schema')">
              Apply sync manifest → schema
            </button>
            <button class="btn primary" :disabled="busy" @click="sync('schema-to-manifest')">
              Apply sync schema → manifest
            </button>
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="error">
        {{ errorMsg }}
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>Fields</h2>

        <div class="addRow">
          <input v-model="newField.name" class="input" placeholder="field name (ex: title)" />
          <select v-model="newField.type" class="select">
            <option v-for="t in typeOptions" :key="t" :value="t">
              {{ t }}
            </option>
          </select>

          <label class="chk"><input v-model="newField.array" type="checkbox" /> array</label>
          <label class="chk"><input v-model="newField.required" type="checkbox" /> required</label>

          <button class="btn primary" @click="addField">
            Add
          </button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Array</th>
              <th>Required</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(meta, name) in draft" :key="name">
              <td><code>{{ name }}</code></td>
              <td>
                <select v-model="draft[name].type" class="select sm">
                  <option v-for="t in typeOptions" :key="t" :value="t">
                    {{ t }}
                  </option>
                </select>
              </td>
              <td><input v-model="draft[name].array" type="checkbox" /></td>
              <td><input v-model="draft[name].required" type="checkbox" /></td>
              <td>
                <button class="btn danger" @click="removeField(name)">
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="actions">
          <button class="btn" :disabled="busy" @click="diff">
            Diff (dry-run)
          </button>
          <button class="btn primary" :disabled="busy" @click="apply">
            Apply
          </button>
        </div>
      </div>

      <div class="card">
        <h2>Preview</h2>
        <p class="hint">
          Le JSON ci-dessous correspond à ce qui sera persisté dans <code>services/.nfz/manifest.json</code>.
        </p>
        <pre class="pre">{{ JSON.stringify(draft, null, 2) }}</pre>

        <h2 style="margin-top: 18px;">
          Diff
        </h2>
        <pre class="pre">{{ JSON.stringify(lastDiff, null, 2) }}</pre>

        <h2 style="margin-top: 18px;">
          Last apply result
        </h2>
        <pre class="pre">{{ JSON.stringify(lastResult, null, 2) }}</pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family:
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    sans-serif;
}
.head h1 {
  font-size: 28px;
  margin: 0 0 6px;
}
.sub {
  margin: 0 0 18px;
  opacity: 0.75;
}
.card {
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 14px;
  padding: 16px;
  background: rgba(127, 127, 127, 0.06);
}
.metaTop {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: center;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(127, 127, 127, 0.25);
  background: rgba(127, 127, 127, 0.1);
}
.badge.warn {
  border-color: rgba(220, 38, 38, 0.45);
  background: rgba(220, 38, 38, 0.12);
}
.badge.ok {
  border-color: rgba(22, 163, 74, 0.45);
  background: rgba(22, 163, 74, 0.12);
}
.driftBox {
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.08);
}
.driftTitle {
  font-weight: 700;
  margin-bottom: 8px;
}
.driftCols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 980px) {
  .metaTop {
    grid-template-columns: 1fr;
  }
  .driftCols {
    grid-template-columns: 1fr;
  }
}
.driftLbl {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}
.muted {
  opacity: 0.65;
}
.driftActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 14px;
}
@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.label {
  font-weight: 600;
}
.select,
.input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: rgba(255, 255, 255, 0.85);
}
.select.sm {
  padding: 6px 8px;
}
.btn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}
.btn.primary {
  background: rgba(37, 99, 235, 0.12);
  border-color: rgba(37, 99, 235, 0.45);
}
.btn.danger {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.45);
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 14px;
}
.addRow {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin: 10px 0 12px;
}
.chk {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  opacity: 0.9;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th,
.table td {
  text-align: left;
  padding: 10px 8px;
  border-top: 1px solid rgba(127, 127, 127, 0.25);
}
.pre {
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(127, 127, 127, 0.2);
}
</style>
