<template>
  <QPage class="grid gap-6">
    <AppHeroCard title="Administration" subtitle="Zone de travail pour la suite : seeds, réglages locaux et contrôles d'intégration du module NFZ." />
    <section class="grid gap-6 lg:grid-cols-2">
      <div class="surface-card p-6 nfz-subtitle">
        <div class="text-lg font-semibold nfz-title">Seeds</div>
        <p class="mt-3">Le seed dummy utilisateur est piloté via les variables <code>NFZ_SEED_DUMMY_USER</code> et compagnons.</p>
      </div>
      <div class="surface-card p-6 nfz-subtitle">
        <div class="text-lg font-semibold nfz-title">Audit NFZ</div>
        <p class="mt-3">Consulte le dossier <code>AI_CONTEXT</code> pour la feuille de route sur les améliorations du module nuxt-feathers-zod.</p>
      </div>
    </section>
  </QPage>
</template>
