<script setup lang="ts">
definePageMeta({ roles: ['admin'] })

const session = useStudioSessionStore()
</script>

<template>
  <section class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
    <div class="rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
      <p class="text-sm font-bold uppercase tracking-widest text-secondary">
        RBAC
      </p>
      <h1 class="mt-2 text-4xl font-black">
        Administration
      </h1>
      <p class="mt-4 max-w-3xl opacity-70">
        Cette route exige le rôle <code>admin</code>. La protection UI ne remplace pas les hooks Feathers côté serveur.
      </p>
      <div class="mt-6 alert alert-success">
        Session active pour {{ session.userLabel }} — rôles : {{ session.roles.join(', ') }}.
      </div>
    </div>
  </section>
</template>
