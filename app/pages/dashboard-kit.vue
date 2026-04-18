<script setup lang="ts">
import DashboardSectionCard from '../components/dashboard/kit/DashboardSectionCard.vue'
import DashboardContextBar from '../components/dashboard/kit/DashboardContextBar.vue'
import DashboardWorkspaceTabs from '../components/dashboard/kit/DashboardWorkspaceTabs.vue'
import DashboardInspectorPanel from '../components/dashboard/kit/DashboardInspectorPanel.vue'
import type { DashboardContextItem } from '../components/dashboard/kit/DashboardContextBar.vue'
import type { DashboardWorkspaceTabItem } from '../components/dashboard/kit/DashboardWorkspaceTabs.vue'

const pageTabs = ref('workspace')
const workspaceTabs = ref('builder')
const previewTabs = ref('manifest')

const contextItems = computed<DashboardContextItem[]>(() => [
  { label: 'Projet', value: 'nuxt4_nfz_embedded', icon: 'mdi-folder-cog-outline', tone: 'primary' },
  { label: 'Stack', value: 'Quasar + UnoCSS + NFZ', icon: 'mdi-layers-triple-outline', tone: 'info' },
  { label: 'Mongo', value: 'mongo-admin', icon: 'mdi-database-outline', tone: 'positive' },
  { label: 'État', value: 'Stable', icon: 'mdi-check-decagram-outline', tone: 'positive' }
])

const levelOneTabs = computed<DashboardWorkspaceTabItem[]>(() => [
  { name: 'workflow', label: 'Workflow', icon: 'mdi-timeline-outline', caption: 'Parcours builder et configuration' },
  { name: 'workspace', label: 'Workspace', icon: 'mdi-view-dashboard-outline', caption: 'Builder, preview et tests' }
])

const levelTwoTabs = computed<DashboardWorkspaceTabItem[]>(() => [
  { name: 'builder', label: 'Builder', icon: 'mdi-hammer-wrench', caption: 'Édition des champs et options' },
  { name: 'preview', label: 'Preview', icon: 'mdi-file-eye-outline', caption: 'Manifest, fichiers et diff' },
  { name: 'tests', label: 'Tests', icon: 'mdi-flask-outline', caption: 'Tests méthodes et payloads' }
])

const previewSubTabs = computed<DashboardWorkspaceTabItem[]>(() => [
  { name: 'manifest', label: 'Manifest', icon: 'mdi-file-document-outline' },
  { name: 'schema', label: 'Schéma', icon: 'mdi-shape-outline' },
  { name: 'diff', label: 'Diff', icon: 'mdi-compare' }
])

const form = reactive({
  serviceName: 'home-menus',
  path: 'api/v1/home-menus',
  adapter: 'mongodb',
  auth: true,
  docs: true
})

const sampleFields = ref([
  { name: 'title', type: 'string', required: true, indexed: false },
  { name: 'side', type: 'enum', required: true, indexed: true },
  { name: 'order', type: 'number', required: false, indexed: true }
])

const methods = ref(['find', 'get', 'create', 'patch', 'remove'])
</script>

<template>
  <QPage class="dash-page">
    <DashboardSectionCard
      kicker="Dashboard Kit"
      title="Composants réutilisables dashboard"
      copy="Cette page sert de playground visuel pour les composants structurels réutilisables qui seront ensuite appliqués à mongo, services-manager et aux prochaines pages admin."
    >
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="grid gap-6">
          <DashboardContextBar :items="contextItems" />

          <DashboardWorkspaceTabs v-model="pageTabs" :tabs="levelOneTabs">
            <QTabPanel name="workflow" class="p-4 md:p-5">
              <DashboardSectionCard
                kicker="Workflow"
                title="Parcours builder"
                copy="Version réutilisable d'un panneau de workflow et de configuration."
                dense
                flat
              >
                <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div class="grid gap-4">
                    <div class="builder-workflow-track">
                      <div v-for="(step, index) in ['Scanner', 'Configurer', 'Prévisualiser', 'Tester', 'Apply']" :key="step" class="builder-workflow-item">
                        <div :class="index < 3 ? 'builder-workflow-dot builder-workflow-dot-done' : index === 3 ? 'builder-workflow-dot builder-workflow-dot-active' : 'builder-workflow-dot builder-workflow-dot-pending'">
                          <QIcon :name="index < 3 ? 'check' : index === 3 ? 'edit' : 'schedule'" />
                        </div>
                        <div class="text-xs font-700 text-[var(--nfz-text)]">{{ step }}</div>
                      </div>
                    </div>

                    <div class="grid gap-3 md:grid-cols-2">
                      <QInput v-model="form.serviceName" outlined dense label="Nom du service" />
                      <QInput v-model="form.path" outlined dense label="Path Feathers" />
                      <QSelect v-model="form.adapter" outlined dense label="Adapter" :options="['mongodb', 'memory', 'custom']" />
                      <div class="flex flex-wrap items-center gap-3 rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] px-4 py-3">
                        <QToggle v-model="form.auth" label="Auth" />
                        <QToggle v-model="form.docs" label="Docs" />
                      </div>
                    </div>
                  </div>

                  <DashboardInspectorPanel
                    kicker="Résumé"
                    title="Configuration courante"
                    subtitle="Exemple réutilisable de panneau latéral compact pour les futures pages dashboard."
                    :badges="[{ label: 'Adapter', value: form.adapter, tone: 'info' }, { label: 'Méthodes', value: methods.length.toString(), tone: 'primary' }]"
                    compact
                  >
                    <div class="dash-info-list">
                      <div class="dash-info-row"><span>Service</span><strong>{{ form.serviceName }}</strong></div>
                      <div class="dash-info-row"><span>Path</span><strong>{{ form.path }}</strong></div>
                      <div class="dash-info-row"><span>Auth</span><strong>{{ form.auth ? 'Oui' : 'Non' }}</strong></div>
                      <div class="dash-info-row"><span>Docs</span><strong>{{ form.docs ? 'Oui' : 'Non' }}</strong></div>
                    </div>
                  </DashboardInspectorPanel>
                </div>
              </DashboardSectionCard>
            </QTabPanel>

            <QTabPanel name="workspace" class="p-4 md:p-5">
              <DashboardWorkspaceTabs v-model="workspaceTabs" :tabs="levelTwoTabs" vertical>
                <QTabPanel name="builder" class="p-4 md:p-5">
                  <DashboardSectionCard
                    kicker="Workspace"
                    title="Schema Builder"
                    copy="Exemple de formulaire et de tableau compact pour l’édition des champs."
                    dense
                    flat
                  >
                    <div class="grid gap-3">
                      <div v-for="field in sampleFields" :key="field.name" class="builder-field-row xl:grid-cols-[1.1fr,.7fr,.5fr,.5fr]">
                        <QInput :model-value="field.name" dense outlined label="Champ" />
                        <QInput :model-value="field.type" dense outlined label="Type" />
                        <QToggle :model-value="field.required" label="Requis" />
                        <QToggle :model-value="field.indexed" label="Indexé" />
                      </div>
                    </div>
                  </DashboardSectionCard>
                </QTabPanel>

                <QTabPanel name="preview" class="p-4 md:p-5">
                  <DashboardSectionCard
                    kicker="Workspace"
                    title="Preview Generator"
                    copy="Sous-navigation dédiée à la génération, au diff et à la prévisualisation des fichiers."
                    dense
                    flat
                  >
                    <DashboardToolbar compact separated>
                      <QBtn color="primary" icon="mdi-content-copy" label="Copier" dense unelevated no-caps />
                      <QBtn color="grey-8" icon="mdi-flash-outline" label="Dry-run" dense unelevated no-caps />
                      <QBtn color="positive" icon="mdi-check" label="Apply" dense unelevated no-caps />
                    </DashboardToolbar>

                    <div class="mt-4">
                      <DashboardWorkspaceTabs v-model="previewTabs" :tabs="previewSubTabs" vertical>
                        <QTabPanel name="manifest" class="p-4">
                          <div class="dash-code-block text-xs">
{{ JSON.stringify({
  serviceName: form.serviceName,
  path: form.path,
  adapter: form.adapter,
  auth: form.auth,
  docs: form.docs,
  methods
}, null, 2) }}
                          </div>
                        </QTabPanel>
                        <QTabPanel name="schema" class="p-4">
                          <div class="dash-code-block text-xs">export const schema = z.object({
  title: z.string(),
  side: z.enum(['left', 'right']),
  order: z.number().optional()
})</div>
                        </QTabPanel>
                        <QTabPanel name="diff" class="p-4">
                          <div class="dash-code-block text-xs">--- source
+++ generated
@@
- side: z.string()
+ side: z.enum(['left', 'right'])</div>
                        </QTabPanel>
                      </DashboardWorkspaceTabs>
                    </div>
                  </DashboardSectionCard>
                </QTabPanel>

                <QTabPanel name="tests" class="p-4 md:p-5">
                  <DashboardSectionCard
                    kicker="Workspace"
                    title="Tests méthodes"
                    copy="Composant de test réutilisable pour payload, query et aperçu de réponse."
                    dense
                    flat
                  >
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div class="grid gap-3">
                        <QSelect :model-value="'find'" outlined dense label="Méthode" :options="methods" />
                        <QInput type="textarea" autogrow outlined dense label="Payload JSON" :model-value="JSON.stringify({ side: 'left', title: 'Accueil' }, null, 2)" />
                        <QInput type="textarea" autogrow outlined dense label="Query JSON" :model-value="JSON.stringify({ $limit: 10 }, null, 2)" />
                      </div>
                      <DashboardInspectorPanel
                        kicker="Test"
                        title="Aperçu"
                        subtitle="Vue réutilisable pour curl et réponse simulée."
                        compact
                      >
                        <div class="dash-code-block text-[11px]">curl -X GET /feathers/{{ form.path }}?\$limit=10</div>
                        <div class="dash-code-block text-[11px]">{
  "total": 1,
  "data": [{ "title": "Accueil", "side": "left" }]
}</div>
                      </DashboardInspectorPanel>
                    </div>
                  </DashboardSectionCard>
                </QTabPanel>
              </DashboardWorkspaceTabs>
            </QTabPanel>
          </DashboardWorkspaceTabs>
        </div>

        <div class="grid gap-6">
          <DashboardInspectorPanel
            kicker="Inspector"
            title="Composants extraits"
            subtitle="Premier lot de composants structurels prêts à être réutilisés dans mongo, services-manager et les futures pages dashboard."
            :badges="[{ label: 'Lot', value: 'v1', tone: 'primary' }, { label: 'Cible', value: 'Dashboard', tone: 'info' }]"
          >
            <div class="dash-info-list">
              <div class="dash-info-row"><span>SectionCard</span><strong>OK</strong></div>
              <div class="dash-info-row"><span>ContextBar</span><strong>OK</strong></div>
              <div class="dash-info-row"><span>Toolbar</span><strong>OK</strong></div>
              <div class="dash-info-row"><span>WorkspaceTabs</span><strong>OK</strong></div>
              <div class="dash-info-row"><span>InspectorPanel</span><strong>OK</strong></div>
            </div>
          </DashboardInspectorPanel>

          <DashboardSectionCard
            kicker="Roadmap"
            title="Suite logique"
            copy="La prochaine étape sera de remplacer progressivement les blocs similaires dans mongo.vue et services-manager.vue par ces composants réutilisables."
            dense
          >
            <div class="grid gap-3 text-sm text-[var(--nfz-text-soft)]">
              <div class="dash-list-item">1. Migrer les barres de contexte et toolbars.</div>
              <div class="dash-list-item">2. Migrer les tabs de workspace.</div>
              <div class="dash-list-item">3. Uniformiser les panneaux inspecteur.</div>
            </div>
          </DashboardSectionCard>
        </div>
      </div>
    </DashboardSectionCard>
  </QPage>
</template>
