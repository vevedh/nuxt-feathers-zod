<script setup lang="ts">
import { BUILDER_PRESET_CATALOG, BUILDER_STARTER_CATALOG } from '../utils/builder-presets'

const presets = BUILDER_PRESET_CATALOG
const starters = BUILDER_STARTER_CATALOG

const routeToPreset = (preset: string) => `/services-manager?preset=${preset}`
const routeToStarter = (starter: string) => `/services-manager?starter=${starter}`
const authDemoRoute = '/auth-demo'
const diagnosticsRoute = '/diagnostics'
const barrelExamples = ['none', 'service', 'service+root']
const sampleManifest = `[{
  "name": "articles",
  "path": "articles",
  "collection": "articles",
  "adapter": "mongodb",
  "schemaMode": "zod",
  "auth": false,
  "hookPreset": "standard",
  "methods": ["find", "get", "create", "patch", "remove"],
  "idField": "_id",
  "hooksFileMode": "separate",
  "barrelMode": "service"
}]`
</script>

<template>
  <QPage class="dash-page">
    <section class="dash-panel">
      <div class="dash-kicker">Builder Studio</div>
      <h1 class="mt-2 dash-title">Démo builder orientée produit</h1>
      <p class="mt-3 nfz-subtitle max-w-[900px]">
        Cette page sert à montrer le builder comme une vraie surface produit : choix du preset,
        compréhension du layout NFZ généré, des barrels optionnels et des conventions auth/users, puis bascule immédiate vers <code>/services-manager</code>.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <QBtn color="primary" unelevated icon="dataset" label="Ouvrir le builder" to="/services-manager" />
        <QBtn color="secondary" flat icon="description" label="Diagnostics" :to="diagnosticsRoute" />
        <QBtn color="accent" flat icon="lock" label="Auth demo" :to="authDemoRoute" />
      </div>
    </section>

    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">Business starters</div>
          <h2 class="mt-2 dash-title">Variantes métier</h2>
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-2 xl:grid-cols-4">
        <div v-for="starter in starters" :key="starter.id" class="surface-soft rounded-5 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-base font-semibold nfz-title">{{ starter.title }}</div>
            <QIcon :name="starter.icon" :color="starter.tone" size="22px" />
          </div>
          <div class="mt-2 text-sm nfz-subtitle">{{ starter.copy }}</div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <QBadge outline color="grey-7">preset {{ starter.presetId }}</QBadge>
            <QBadge v-for="field in starter.service.fields || []" :key="field.id" outline color="grey-7">{{ field.name }}</QBadge>
          </div>
          <div class="mt-4 flex gap-2 flex-wrap">
            <QBtn :color="starter.tone" unelevated size="sm" icon="play_arrow" label="Ouvrir" :to="routeToStarter(starter.id)" />
            <QBtn v-if="starter.id === 'users'" flat size="sm" color="accent" icon="lock" label="Auth demo" :to="authDemoRoute" />
          </div>
        </div>
      </div>
    </section>

    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">Official presets</div>
          <h2 class="mt-2 dash-title">Presets à démontrer</h2>
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-2 xl:grid-cols-4">
        <div v-for="preset in presets" :key="preset.id" class="surface-soft rounded-5 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-base font-semibold nfz-title">{{ preset.title }}</div>
            <QIcon :name="preset.icon" :color="preset.tone" size="22px" />
          </div>
          <div class="mt-2 text-sm nfz-subtitle">{{ preset.copy }}</div>
          <ul class="mt-3 space-y-1 text-sm nfz-subtitle pl-4">
            <li v-for="bullet in preset.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <QBadge v-for="field in preset.service.fields || []" :key="field.id" outline color="grey-7">{{ field.name }}</QBadge>
          </div>
          <div class="mt-4 flex gap-2 flex-wrap">
            <QBtn :color="preset.tone" unelevated size="sm" icon="play_arrow" label="Tester" :to="routeToPreset(preset.id)" />
            <QBtn v-if="preset.id === 'mongoSecureCrud'" flat size="sm" color="accent" icon="lock" label="Voir Auth demo" :to="authDemoRoute" />
          </div>
        </div>
      </div>
    </section>

    

    
    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">CLI parity</div>
          <h2 class="mt-2 dash-title">Barrels et conventions auth/users</h2>
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-2">
        <div class="surface-soft rounded-5 p-4">
          <div class="text-base font-semibold nfz-title">Modes de barrel</div>
          <div class="mt-2 text-sm nfz-subtitle">Le builder peut écrire un <code>index.ts</code> local au service, et en option un <code>services/index.ts</code> agrégé sur tous les services marqués <code>service+root</code>.</div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <QBadge v-for="mode in barrelExamples" :key="mode" outline color="grey-7">{{ mode }}</QBadge>
          </div>
        </div>
        <div class="surface-soft rounded-5 p-4">
          <div class="text-base font-semibold nfz-title">Starter users plus NFZ-native</div>
          <div class="mt-2 text-sm nfz-subtitle">Le starter <code>users</code> vise un comportement plus proche des conventions NFZ local auth : masquage du mot de passe en externe et <code>passwordHash</code> dans les resolvers data/patch.</div>
          <div class="mt-4 flex gap-2 flex-wrap">
            <QBtn color="primary" unelevated size="sm" icon="group" label="Tester users starter" :to="routeToStarter('users')" />
            <QBtn color="accent" flat size="sm" icon="lock" label="Voir Auth demo" :to="authDemoRoute" />
          </div>
        </div>
      </div>
    </section>

<section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">Manifest starter</div>
          <h2 class="mt-2 dash-title">Exemple JSON à coller</h2>
        </div>
      </div>
      <QCard flat bordered class="builder-card overflow-hidden">
        <QCardSection class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold nfz-title">Manifest minimal</div>
            <div class="mt-1 text-sm nfz-subtitle">À coller dans le panneau import/export du builder.</div>
          </div>
          <QBadge outline color="primary">builder-manifest</QBadge>
        </QCardSection>
        <QSeparator />
        <QCardSection class="p-0">
          <pre class="m-0 overflow-auto p-4 text-sm">{{ sampleManifest }}</pre>
        </QCardSection>
      </QCard>
    </section>
  

    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">Builder → Auth</div>
          <h2 class="mt-2 dash-title">Parcours produit recommandé</h2>
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-3">
        <div class="surface-soft rounded-5 p-4">
          <div class="text-base font-semibold nfz-title">1. Choisir un preset</div>
          <div class="mt-2 text-sm nfz-subtitle">Commence par <code>mongoCrud</code> ou <code>memoryCrud</code> pour montrer le builder sans friction.</div>
        </div>
        <div class="surface-soft rounded-5 p-4">
          <div class="text-base font-semibold nfz-title">2. Ouvrir Auth demo</div>
          <div class="mt-2 text-sm nfz-subtitle">Basculer ensuite vers <code>mongoSecureCrud</code> puis ouvrir la démo auth pour matérialiser la story enterprise.</div>
        </div>
        <div class="surface-soft rounded-5 p-4">
          <div class="text-base font-semibold nfz-title">3. Dry-run puis Apply</div>
          <div class="mt-2 text-sm nfz-subtitle">Comparer le layout NFZ, la commande CLI approchante et enfin exécuter l'apply vers <code>services/</code>.</div>
        </div>
      </div>
    </section>

  </QPage>
</template>
