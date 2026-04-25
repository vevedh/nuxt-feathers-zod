<script setup lang="ts">
type FieldMeta = { type: string, required?: boolean, array?: boolean }
type SchemaInfo = {
  service: string
  schemaFile: string
  manifestPath: string | null
  adapter?: string
  auth?: boolean
  docs?: boolean
  idField?: string
  collection?: string
  fields: Record<string, FieldMeta>
}

const typeOptions = ['string', 'number', 'int', 'boolean', 'date', 'objectId', 'json']

const selected = ref<string>('')

const { data: servicesData, refresh: refreshServices } = await useFetch('/api/nfz/services')
const services = computed(() => (servicesData.value as any)?.services ?? [])

watch(services, (list) => {
  if (!selected.value && Array.isArray(list) && list.length)
    selected.value = list[0]
}, { immediate: true })

const info = ref<SchemaInfo | null>(null)
const draft = ref<Record<string, FieldMeta>>({})
const newField = reactive({ name: '', type: 'string', required: true, array: false })

async function load() {
  if (!selected.value) return
  const { data, error } = await useFetch<SchemaInfo>(`/api/nfz/schema/${selected.value}`, { key: `schema-${selected.value}` })
  if (error.value) throw error.value
  info.value = data.value as any
  draft.value = JSON.parse(JSON.stringify((data.value as any)?.fields ?? {}))
}

watch(selected, () => { load() }, { immediate: true })

function addField() {
  const name = newField.name.trim()
  if (!name) return
  if (draft.value[name]) return
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
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || String(e)
  } finally {
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
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || String(e)
  } finally {
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
          <option v-for="s in services" :key="s" :value="s">{{ s }}</option>
        </select>

        <button class="btn" @click="refreshServices()">Refresh</button>
      </div>

      <div v-if="info" class="meta">
        <div><b>schemaFile</b> <code>{{ info.schemaFile }}</code></div>
        <div><b>manifest</b> <code>{{ info.manifestPath || '(absent)' }}</code></div>
        <div class="metaGrid">
          <div><b>adapter</b> {{ info.adapter || '-' }}</div>
          <div><b>auth</b> {{ info.auth ? 'on' : 'off' }}</div>
          <div><b>docs</b> {{ info.docs ? 'on' : 'off' }}</div>
          <div><b>idField</b> {{ info.idField || '-' }}</div>
          <div><b>collection</b> {{ info.collection || '-' }}</div>
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
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>

          <label class="chk"><input v-model="newField.array" type="checkbox" /> array</label>
          <label class="chk"><input v-model="newField.required" type="checkbox" /> required</label>

          <button class="btn primary" @click="addField">Add</button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Array</th>
              <th>Required</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(meta, name) in draft" :key="name">
              <td><code>{{ name }}</code></td>
              <td>
                <select v-model="draft[name].type" class="select sm">
                  <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </td>
              <td><input v-model="draft[name].array" type="checkbox" /></td>
              <td><input v-model="draft[name].required" type="checkbox" /></td>
              <td>
                <button class="btn danger" @click="removeField(name)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="actions">
          <button class="btn" :disabled="busy" @click="diff">Diff (dry-run)</button>
          <button class="btn primary" :disabled="busy" @click="apply">Apply</button>
        </div>
      </div>

      <div class="card">
        <h2>Preview</h2>
        <p class="hint">
          Le JSON ci-dessous correspond à ce qui sera persisté dans <code>services/.nfz/manifest.json</code>.
        </p>
        <pre class="pre">{{ JSON.stringify(draft, null, 2) }}</pre>

        <h2 style="margin-top: 18px;">Diff</h2>
        <pre class="pre">{{ JSON.stringify(lastDiff, null, 2) }}</pre>

        <h2 style="margin-top: 18px;">Last apply result</h2>
        <pre class="pre">{{ JSON.stringify(lastResult, null, 2) }}</pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.head h1 { font-size: 28px; margin: 0 0 6px; }
.sub { margin: 0 0 18px; opacity: .75; }
.card { border: 1px solid rgba(127,127,127,.25); border-radius: 14px; padding: 16px; background: rgba(127,127,127,.06); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.label { font-weight: 600; }
.select, .input { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(127,127,127,.35); background: rgba(255,255,255,.85); }
.select.sm { padding: 6px 8px; }
.btn { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(127,127,127,.35); background: rgba(255,255,255,.85); cursor: pointer; }
.btn.primary { background: rgba(37, 99, 235, .12); border-color: rgba(37, 99, 235, .45); }
.btn.danger { background: rgba(220, 38, 38, .12); border-color: rgba(220, 38, 38, .45); }
.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
.addRow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 10px 0 12px; }
.chk { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; opacity: .9; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 10px 8px; border-top: 1px solid rgba(127,127,127,.25); }
.pre { max-height: 320px; overflow: auto; padding: 12px; border-radius: 12px; background: rgba(0,0,0,.06); border: 1px solid rgba(127,127,127,.2); }
.meta { margin-top: 12px; font-size: 14px; opacity: .95; }
.metaGrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
@media (max-width: 980px) { .metaGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.error { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(220,38,38,.12); border: 1px solid rgba(220,38,38,.35); }
.hint { opacity: .75; margin: 0 0 10px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
</style>
