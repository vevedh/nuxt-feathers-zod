<script setup lang="ts">
definePageMeta({
  public: true,
  layout: 'default',
})

const auth = useLocalAuthUi()
const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <div class="min-h-screen grid bg-slate-950 text-white lg:grid-cols-[1.05fr_0.95fr]">
    <section class="nfz-auth-hero hidden p-10 lg:flex lg:flex-col lg:justify-between">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
          <QIcon name="bolt" />
          Starter production-ready
        </div>

        <div class="mt-16 max-w-2xl">
          <h1 class="text-5xl font-800 leading-tight">
            Nuxt 4 + Quasar 2 + NFZ, avec auth locale propre.
          </h1>
          <p class="mt-6 text-lg text-blue-50/80 leading-8">
            Une base claire pour dashboard, middleware session, RBAC,
            Pinia et accès Feathers encapsulé.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <div class="text-2xl font-800">
            NFZ
          </div>
          <div class="mt-1 text-sm text-blue-50/70">
            Runtime Feathers natif
          </div>
        </div>
        <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <div class="text-2xl font-800">
            Pinia
          </div>
          <div class="mt-1 text-sm text-blue-50/70">
            Store session
          </div>
        </div>
        <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <div class="text-2xl font-800">
            RBAC
          </div>
          <div class="mt-1 text-sm text-blue-50/70">
            Routes protégées
          </div>
        </div>
      </div>
    </section>

    <section class="flex items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <QCard class="w-full max-w-md rounded-3xl border border-slate-200 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <QCardSection class="p-8">
          <div class="mb-8">
            <div class="mb-3 h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-600 text-white">
              <QIcon name="lock" size="26px" />
            </div>
            <h2 class="text-2xl font-800">
              Connexion
            </h2>
            <p class="mt-2 nfz-muted">
              {{ runtimeConfig.public.appSubtitle }}
            </p>
          </div>

          <QBanner v-if="auth.error.value" rounded class="mb-5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {{ auth.error.value }}
          </QBanner>

          <QForm class="grid gap-4" @submit.prevent="auth.submit">
            <QInput
              v-model="auth.form.userId"
              outlined
              label="Identifiant"
              autocomplete="username"
              :disable="auth.loading.value"
            >
              <template #prepend>
                <QIcon name="person" />
              </template>
            </QInput>

            <QInput
              v-model="auth.form.password"
              outlined
              label="Mot de passe"
              autocomplete="current-password"
              :type="auth.passwordVisible.value ? 'text' : 'password'"
              :disable="auth.loading.value"
            >
              <template #prepend>
                <QIcon name="key" />
              </template>
              <template #append>
                <QBtn
                  :ripple="false"
                  flat
                  dense
                  round
                  :icon="auth.passwordVisible.value ? 'visibility_off' : 'visibility'"
                  @click="auth.passwordVisible.value = !auth.passwordVisible.value"
                />
              </template>
            </QInput>

            <div class="flex items-center justify-between text-sm">
              <QCheckbox v-model="auth.form.remember" dense label="Session locale" />
              <span class="nfz-muted">admin / admin123</span>
            </div>

            <QBtn
              :ripple="false"
              unelevated
              color="primary"
              size="lg"
              type="submit"
              class="rounded-xl"
              :disable="!auth.canSubmit.value"
              :loading="auth.loading.value"
              label="Se connecter"
            />
          </QForm>
        </QCardSection>
      </QCard>
    </section>
  </div>
</template>
