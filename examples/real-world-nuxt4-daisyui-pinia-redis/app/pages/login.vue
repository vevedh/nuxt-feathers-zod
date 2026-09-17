<script setup lang="ts">
import { Button } from 'daisy-ui-kit'

definePageMeta({ public: true })

const auth = useLocalAuthUi()
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-6 py-14">
    <div class="card w-full max-w-md border border-base-300 bg-base-100 shadow-2xl">
      <div class="card-body gap-5">
        <div>
          <p class="text-sm font-bold uppercase tracking-widest text-primary">
            NFZ local/JWT
          </p>
          <h1 class="mt-2 text-3xl font-black">
            Connexion
          </h1>
          <p class="mt-2 opacity-65">
            Le compte de démonstration est créé uniquement si le seed est activé.
          </p>
        </div>

        <div v-if="auth.error.value" class="alert alert-error">
          {{ auth.error.value }}
        </div>

        <form class="grid gap-4" @submit.prevent="auth.submit">
          <label class="form-control gap-2">
            <span class="label-text font-semibold">Identifiant</span>
            <input
              v-model.trim="auth.form.userId"
              class="input input-bordered"
              autocomplete="username"
              required
              minlength="3"
            />
          </label>

          <label class="form-control gap-2">
            <span class="label-text font-semibold">Mot de passe</span>
            <input
              v-model="auth.form.password"
              class="input input-bordered"
              :type="auth.passwordVisible.value ? 'text' : 'password'"
              autocomplete="current-password"
              required
              minlength="6"
            />
          </label>

          <label class="label cursor-pointer justify-start gap-3">
            <input v-model="auth.passwordVisible.value" type="checkbox" class="checkbox checkbox-sm" />
            <span class="label-text">Afficher le mot de passe</span>
          </label>

          <Button primary type="submit" :disabled="!auth.canSubmit.value || auth.loading.value">
            {{ auth.loading.value ? 'Connexion…' : 'Se connecter' }}
          </Button>
        </form>

        <div class="rounded-xl bg-base-200 p-4 text-sm opacity-75">
          Démo locale : <code>admin</code> / <code>admin123</code>. Ne jamais conserver ce mot de passe en production.
        </div>
      </div>
    </div>
  </section>
</template>
