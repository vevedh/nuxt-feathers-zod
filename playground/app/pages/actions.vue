<script setup lang="ts">
const auth = useAuth()
await auth.init()

const api = useNuxtApp().$api

const form = reactive<{ action: string, payload: string }>({
  action: 'reindex',
  payload: '{"dryRun":true}',
})

const result = ref<any>(null)
const error = ref<string | null>(null)
const running = ref(false)

function parsePayload(raw: string) {
  try {
    return raw?.trim() ? JSON.parse(raw) : undefined
  }
  catch (e: any) {
    throw new Error(`Invalid JSON payload: ${e?.message || String(e)}`)
  }
}

async function runAction() {
  error.value = null
  result.value = null
  running.value = true
  try {
    const payload = parsePayload(form.payload)
    const res = await api.service('actions').run({ action: form.action, payload })
    result.value = res
  }
  catch (e: any) {
    error.value = e?.message || String(e)
  }
  finally {
    running.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1>Custom service: actions.run()</h1>

    <p>
      Authenticated: <strong>{{ auth.isAuthenticated ? 'yes' : 'no' }}</strong>
      <span v-if="auth.user"> — user: <code>{{ auth.user?.email || auth.user?.userId || auth.user?.id }}</code></span>
    </p>

    <p>
      This page calls the <code>actions</code> custom service method <code>run</code> (no adapter).
    </p>

    <div v-if="!auth.isAuthenticated" class="warn">
      <p>
        Note: <code>actions.run</code> is protected by <code>authenticate('jwt')</code> in this template.
        Log in on the home page first, then come back.
      </p>
    </div>

    <div class="card">
      <label>
        Action
        <input v-model="form.action" type="text" placeholder="reindex" />
      </label>

      <label>
        Payload (JSON)
        <textarea v-model="form.payload" rows="6" placeholder="{&quot;dryRun&quot;:true}"></textarea>
      </label>

      <div class="row">
        <button :disabled="running" @click="runAction">
          {{ running ? 'Running…' : 'Run' }}
        </button>

        <NuxtLink to="/messages">
          Go to protected page (/messages)
        </NuxtLink>

        <NuxtLink to="/">
          Back to home
        </NuxtLink>
      </div>
    </div>

    <div v-if="error" class="error">
      <strong>Error:</strong>
      <pre>{{ error }}</pre>
    </div>

    <div v-else-if="result" class="result">
      <strong>Result:</strong>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 820px;
  margin: 24px auto;
  padding: 0 16px;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial;
}

.card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}
input,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

button {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #111827;
  background: transparent;
  cursor: pointer;
}

.warn {
  margin: 16px 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}
.error,
.result {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

pre {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
