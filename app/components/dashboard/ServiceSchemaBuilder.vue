<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import BuilderSummaryPanel from './panels/BuilderSummaryPanel.vue'
import PreviewGeneratorPanel from './panels/PreviewGeneratorPanel.vue'
import MethodTestsPanel from './panels/MethodTestsPanel.vue'
import {
  buildGeneratedFiles,
  buildHooksPreview,
  buildRootBarrelPreviewForServices,
  buildSchemaPreview,
  buildServicePreview,
  createField,
  createService,
  getServiceFsName,
  getServiceProfileMeta,
  inferServiceProfile,
  normalizeManifest,
  slugify,
  type BuilderFieldType,
  type BuilderHooksFileMode,
  type BuilderBarrelMode,
  type BuilderServiceManifest,
  type BuilderServiceOriginKind,
} from '../../utils/builder'
import { BUILDER_PRESET_CATALOG, BUILDER_STARTER_CATALOG, applyBuilderPreset, applyBuilderStarter, getBuilderPresetDefinition, getBuilderStarterDefinition, type BuilderPresetId, type BuilderStarterId } from '../../utils/builder-presets'

type BuilderSourceFile = {
  path: string
  absolutePath?: string
  language: string
  kind: 'service' | 'schema' | 'class' | 'shared' | 'hooks' | 'barrel' | 'root-barrel' | 'other'
  content: string
}

type BuilderMeta = {
  servicesDirs: string[]
  primaryServicesDir: string
}

type BuilderManifestResponse = {
  services: BuilderServiceManifest[]
  sources?: Record<string, BuilderSourceFile[]>
  meta?: BuilderMeta
}

type BuilderDiffRecord = {
  key: string
  label: string
  status: 'same' | 'modified' | 'new' | 'removed'
  language: string
  sourcePath?: string
  generatedPath?: string
  sourceContent: string
  generatedContent: string
  added: number
  removed: number
  changed: number
  diffText: string
}

type ServiceTreeNode = {
  key: string
  label: string
  icon?: string
  kind: 'group' | 'service'
  count?: number
  caption?: string
  scan?: boolean
  adapter?: string
  schemaMode?: string
  hookPresetLabel?: string
  profileLabel?: string
  auth?: boolean
  children?: ServiceTreeNode[]
}

const props = defineProps<{ dark?: boolean }>()
const NfzCodeEditor = defineAsyncComponent(() => import('./NfzCodeEditor.client.vue'))

const emit = defineEmits<{ (e: 'manifest-change', value: BuilderServiceManifest[]): void }>()

const q = useQuasar()
const STORAGE_KEY = 'nfz-builder-manifest-v3'
const NATIVE_METHODS = ['find', 'get', 'create', 'update', 'patch', 'remove'] as const

const services = ref<BuilderServiceManifest[]>([])
const activeId = ref('')
const mainPanelTab = ref<'workflow' | 'presets' | 'workspace'>('workspace')
const workspaceTab = ref<'builder' | 'preview' | 'tests'>('builder')
const previewTab = ref<'manifest' | 'shared' | 'class' | 'schema' | 'service' | 'hooks' | 'barrel' | 'rootBarrel' | 'custom' | 'files' | 'diff'>('schema')
const previewMode = ref<'source' | 'generated'>('generated')
const testsPreviewTab = ref<'request' | 'curl' | 'response'>('request')
const lastRouteApplyKey = ref('')
const filePreviewPath = ref('')
const diffSelectedKey = ref('')
const generatedFiles = ref<{ path: string, language: string, content: string }[]>([])
const sourceFilesById = ref<Record<string, BuilderSourceFile[]>>({})
const generatedFilesOwnerId = ref('')
const builderMeta = ref<BuilderMeta>({ servicesDirs: ['services'], primaryServicesDir: 'services' })
const search = ref('')
const originFilter = ref<'all' | 'demo' | 'scanned' | 'draft'>('all')
const experienceMode = ref<'quickTests' | 'realServices' | 'advanced'>('quickTests')
const importPayload = ref('')
const syncSource = ref<'local' | 'server'>('local')
const syncMessage = ref('Manifest local prêt')
const saveBusy = ref(false)
const loadBusy = ref(false)
const dryRunBusy = ref(false)
const applyBusy = ref(false)
const applyResult = ref<{ outputDir?: string, targetServicesDir?: string, files?: { path: string }[], fileCount?: number, writtenAt?: string, rootBarrelServices?: string[] } | null>(null)
const lastAction = ref<'load' | 'save' | 'dry-run' | 'apply' | 'import' | 'reset' | 'idle'>('idle')
const UI_STORAGE_KEY = 'nfz-builder-ui-v4'
const navSize = ref(28)
const treeExpanded = ref<string[]>(['group-demo', 'group-scanned', 'group-drafts'])
const applyConfirmOpen = ref(false)
const resetConfirmOpen = ref(false)
const deleteConfirmOpen = ref(false)
const sidebarSyncOpen = ref(true)
const sidebarHelpOpen = ref(false)
const testMethod = ref<string>('find')
const testPayload = ref('{\n  "title": "Example"\n}')
const testQuery = ref('{\n  "$limit": 10\n}')

const schemaModes = [
  { label: 'Zod', value: 'zod' },
  { label: 'JSON schema', value: 'json' },
  { label: 'TypeBox', value: 'typebox' },
  { label: 'Sans schéma', value: 'none' },
]
const adapters = ['mongodb', 'memory', 'custom']
const hookPresetOptions = [
  { label: 'Standard NFZ', value: 'standard' },
  { label: 'Action custom', value: 'action' },
  { label: 'Custom libre', value: 'custom' },
]
const hooksFileModeOptions: Array<{ label: string, value: BuilderHooksFileMode }> = [
  { label: 'Inline dans le service', value: 'inline' },
  { label: 'Fichier .hooks séparé', value: 'separate' },
]
const barrelModeOptions: Array<{ label: string, value: BuilderBarrelMode }> = [
  { label: 'Aucun barrel', value: 'none' },
  { label: 'index.ts dans le service', value: 'service' },
  { label: 'index.ts service + services/index.ts', value: 'service+root' },
]

const presetCatalog = BUILDER_PRESET_CATALOG
const starterCatalog = BUILDER_STARTER_CATALOG

const route = useRoute()
const fieldTypeOptions: BuilderFieldType[] = ['string', 'number', 'boolean', 'date', 'array', 'object', 'any']


function getFileKindFromPath(path: string): BuilderSourceFile['kind'] {
  if (/\.schema\.[cm]?[jt]s$/i.test(path)) return 'schema'
  if (/\.shared\.[cm]?[jt]s$/i.test(path)) return 'shared'
  if (/\.class\.[cm]?[jt]s$/i.test(path)) return 'class'
  if (/\.hooks\.[cm]?[jt]s$/i.test(path)) return 'hooks'
  if (/\/index\.[cm]?[jt]s$/i.test(path)) return path.split('/').length > 2 ? 'barrel' : 'root-barrel'
  if (/\.[cm]?[jt]s$/i.test(path)) return 'service'
  return 'other'
}

function getCompareKey(file: { path: string, kind?: BuilderSourceFile['kind'] }) {
  const kind = file.kind || getFileKindFromPath(file.path)
  if (['schema', 'shared', 'class', 'service', 'hooks'].includes(kind)) return kind
  if (kind === 'barrel') return 'barrel'
  if (kind === 'root-barrel') return 'root-barrel'
  return file.path.split('/').pop() || file.path
}

function getCompareLabel(key: string, sourcePath?: string, generatedPath?: string) {
  if (key === 'schema') return 'schema'
  if (key === 'shared') return 'shared'
  if (key === 'class') return 'class'
  if (key === 'service') return 'service'
  if (key === 'hooks') return 'hooks'
  if (key === 'barrel') return 'index.ts (service)'
  if (key === 'root-barrel') return 'services/index.ts'
  const candidate = generatedPath || sourcePath || key
  return candidate.split('/').pop() || candidate
}

function normalizeDiffContent(value: string) {
  return String(value || '').replace(/\r\n/g, '\n')
}

function buildUnifiedDiff(sourceContent: string, generatedContent: string, sourcePath = 'source', generatedPath = 'generated') {
  const sourceLines = normalizeDiffContent(sourceContent).split('\n')
  const generatedLines = normalizeDiffContent(generatedContent).split('\n')
  const sourceExists = normalizeDiffContent(sourceContent).length > 0
  const generatedExists = normalizeDiffContent(generatedContent).length > 0

  if (!sourceExists && !generatedExists) {
    return {
      diffText: `--- ${sourcePath}\n+++ ${generatedPath}\n# Aucun contenu`,
      added: 0,
      removed: 0,
      changed: 0,
    }
  }

  if (!sourceExists) {
    const body = generatedLines.map(line => `+${line}`).join('\n')
    return {
      diffText: `--- ${sourcePath}\n+++ ${generatedPath}\n# Fichier nouveau\n${body}`.trim(),
      added: generatedLines.length,
      removed: 0,
      changed: generatedLines.length,
    }
  }

  if (!generatedExists) {
    const body = sourceLines.map(line => `-${line}`).join('\n')
    return {
      diffText: `--- ${sourcePath}\n+++ ${generatedPath}\n# Fichier supprimé du plan généré\n${body}`.trim(),
      added: 0,
      removed: sourceLines.length,
      changed: sourceLines.length,
    }
  }

  if (normalizeDiffContent(sourceContent) === normalizeDiffContent(generatedContent)) {
    return {
      diffText: `--- ${sourcePath}\n+++ ${generatedPath}\n# Aucun écart détecté`,
      added: 0,
      removed: 0,
      changed: 0,
    }
  }

  const rows = sourceLines.length + 1
  const cols = generatedLines.length + 1
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = sourceLines.length - 1; i >= 0; i--) {
    for (let j = generatedLines.length - 1; j >= 0; j--) {
      dp[i]![j] = sourceLines[i] === generatedLines[j]
        ? dp[i + 1]![j + 1]! + 1
        : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }

  const diffLines: string[] = [`--- ${sourcePath}`, `+++ ${generatedPath}`]
  let i = 0
  let j = 0
  let added = 0
  let removed = 0

  while (i < sourceLines.length && j < generatedLines.length) {
    if (sourceLines[i] === generatedLines[j]) {
      diffLines.push(` ${sourceLines[i]}`)
      i += 1
      j += 1
    }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      diffLines.push(`-${sourceLines[i]}`)
      removed += 1
      i += 1
    }
    else {
      diffLines.push(`+${generatedLines[j]}`)
      added += 1
      j += 1
    }
  }

  while (i < sourceLines.length) {
    diffLines.push(`-${sourceLines[i]}`)
    removed += 1
    i += 1
  }

  while (j < generatedLines.length) {
    diffLines.push(`+${generatedLines[j]}`)
    added += 1
    j += 1
  }

  return {
    diffText: diffLines.join('\n'),
    added,
    removed,
    changed: added + removed,
  }
}

function singularizeToken(value: string) {
  const token = String(value || '').trim()
  if (!token) return 'item'
  const lower = token.toLowerCase()
  if (lower.endsWith('ies') && token.length > 3) return `${token.slice(0, -3)}y`
  if (/(sses|shes|ches|xes|zes)$/i.test(token)) return token.slice(0, -2)
  if (lower.endsWith('s') && !lower.endsWith('ss') && token.length > 1) return token.slice(0, -1)
  return token
}

function singularizeSlug(value: string) {
  const parts = slugify(value).split('-').filter(Boolean)
  if (!parts.length) return 'service'
  if (parts.length === 1) return singularizeToken(parts[0] || '')
  return [...parts.slice(0, -1), singularizeToken(parts.at(-1) || 'item')].join('-')
}

function toBuilderIdentifier(value: string, fallback = 'service') {
  const cleaned = String(value || '').replace(/[^A-Za-z0-9_$]+/g, ' ').trim()
  if (!cleaned) return fallback
  const camel = cleaned.split(/\s+/).filter(Boolean).map((part, index) => {
    const lower = part.toLowerCase()
    return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
  }).join('')
  return camel && !/^[0-9]/.test(camel) ? camel : `_${camel || fallback}`
}

function toBuilderPascal(value: string, fallback = 'Service') {
  const identifier = toBuilderIdentifier(value, fallback)
  return identifier.charAt(0).toUpperCase() + identifier.slice(1)
}

function isCollectionLike(service: BuilderServiceManifest) {
  return ['find', 'get', 'patch', 'remove', 'update'].some(method => service.methods.includes(method))
}

function getSharedBaseName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return !fsName.includes('-') ? toBuilderIdentifier(singularizeSlug(fsName), 'service') : toBuilderIdentifier(fsName, 'service')
}

function getSchemaBaseName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const preferred = isCollectionLike(service) ? singularizeSlug(fsName) : fsName
  return toBuilderIdentifier(preferred, 'service')
}

function getRegisterFunctionName(service: BuilderServiceManifest) {
  return toBuilderIdentifier(singularizeSlug(getServiceFsName(service)), 'service')
}

function getGeneratedClassName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const classBase = !fsName.includes('-') ? singularizeSlug(fsName) : fsName
  return `${toBuilderPascal(classBase, 'Service')}Service`
}

function notify(type: 'positive' | 'negative' | 'warning' | 'info', message: string) {
  try {
    ;(q as any)?.notify?.({ type, message })
  }
  catch {
    console[type === 'negative' ? 'error' : 'log']('[NFZ builder]', message)
  }
}

function persistLocal() {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services.value))
  emit('manifest-change', services.value)
}

function loadLocal() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    services.value = normalizeManifest(raw ? JSON.parse(raw) : undefined)
  }
  catch {
    services.value = [createService()]
  }
  activeId.value = services.value[0]?.id || ''
  syncSource.value = 'local'
  syncMessage.value = 'Manifest local chargé'
}

function persistUi() {
  if (!import.meta.client) return
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
    navSize: navSize.value,
    treeExpanded: treeExpanded.value,
    mainPanelTab: mainPanelTab.value,
    workspaceTab: workspaceTab.value,
    previewTab: previewTab.value,
    previewMode: previewMode.value,
    testsPreviewTab: testsPreviewTab.value,
    originFilter: originFilter.value,
    experienceMode: experienceMode.value,
  }))
}

function loadUi() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    navSize.value = typeof parsed.navSize === 'number' ? parsed.navSize : navSize.value
    treeExpanded.value = Array.isArray(parsed.treeExpanded) ? parsed.treeExpanded : treeExpanded.value
    mainPanelTab.value = ['workflow', 'presets', 'workspace'].includes(parsed.mainPanelTab) ? parsed.mainPanelTab : mainPanelTab.value
    workspaceTab.value = typeof parsed.workspaceTab === 'string' ? parsed.workspaceTab : workspaceTab.value
    previewTab.value = typeof parsed.previewTab === 'string' ? parsed.previewTab : previewTab.value
    previewMode.value = typeof parsed.previewMode === 'string' ? parsed.previewMode : previewMode.value
    testsPreviewTab.value = typeof parsed.testsPreviewTab === 'string' ? parsed.testsPreviewTab : testsPreviewTab.value
    originFilter.value = ['all', 'demo', 'scanned', 'draft'].includes(parsed.originFilter) ? parsed.originFilter : originFilter.value
    experienceMode.value = ['quickTests', 'realServices', 'advanced'].includes(parsed.experienceMode) ? parsed.experienceMode : experienceMode.value
  }
  catch {}
}

function normalizeMethods(value: string[]) {
  return [...new Set(value.map(item => String(item).trim()).filter(Boolean))]
}

function syncManifestResponse(response: BuilderManifestResponse, options: { preserveSelection?: boolean } = {}) {
  const current = activeId.value
  const currentPath = activeService.value?.path
  const currentFsName = getServiceFsName(activeService.value || {})
  services.value = normalizeManifest(response.services)
  sourceFilesById.value = response.sources || {}
  services.value = services.value.map(service => ({
    ...service,
    originKind: (sourceFilesById.value[service.id] || []).length > 0 ? 'scanned' : service.originKind || 'draft',
  }))
  builderMeta.value = response.meta || builderMeta.value
  generatedFilesOwnerId.value = ''
  if (options.preserveSelection) {
    const byId = current ? services.value.find(service => service.id === current) : undefined
    const byPath = currentPath ? services.value.find(service => service.path === currentPath) : undefined
    const byFsName = currentFsName ? services.value.find(service => getServiceFsName(service) === currentFsName) : undefined
    activeId.value = byId?.id ?? byPath?.id ?? byFsName?.id ?? services.value.at(0)?.id ?? ''
  }
  else {
    activeId.value = services.value.at(0)?.id ?? ''
  }
}

async function loadServer(options: { silent?: boolean, preserveSelection?: boolean } = {}) {
  loadBusy.value = true
  try {
    const response = await $fetch<BuilderManifestResponse>('/api/builder/manifest')
    syncManifestResponse(response, options)
    syncSource.value = 'server'
    syncMessage.value = 'Manifest serveur chargé'
    lastAction.value = 'load'
    persistLocal()
  }
  catch (error) {
    console.error('[NFZ builder] load server manifest failed', error)
    if (!options.silent)
      notify('negative', 'Chargement du manifest serveur impossible')
  }
  finally {
    loadBusy.value = false
  }
}

async function saveServer() {
  saveBusy.value = true
  try {
    const response = await $fetch<BuilderManifestResponse>('/api/builder/manifest', {
      method: 'POST',
      body: { services: services.value },
    })
    syncManifestResponse(response, { preserveSelection: true })
    syncSource.value = 'server'
    syncMessage.value = 'Manifest serveur synchronisé'
    lastAction.value = 'save'
    persistLocal()
    notify('positive', 'Manifest serveur enregistré')
  }
  catch (error) {
    console.error('[NFZ builder] save server manifest failed', error)
    notify('negative', 'Enregistrement serveur impossible')
  }
  finally {
    saveBusy.value = false
  }
}

async function loadManifest() {
  await loadServer()
}

async function saveManifest() {
  await saveServer()
}

function setGeneratedFiles(files: { path: string, language: string, content: string }[], ownerId = '') {
  generatedFiles.value = files
  generatedFilesOwnerId.value = ownerId
  filePreviewPath.value = files[0]?.path || ''
}

async function dryRun() {
  dryRunBusy.value = true
  try {
    const response = await $fetch<{ ok: boolean, targetServicesDir?: string, files: { path: string, language: string, content: string }[], rootBarrelServices?: string[] }>('/api/builder/preview', {
      method: 'POST',
      body: { service: activeService.value, services: services.value },
    })
    if (response.targetServicesDir) {
      builderMeta.value = {
        ...builderMeta.value,
        primaryServicesDir: response.targetServicesDir,
        servicesDirs: builderMeta.value.servicesDirs.includes(response.targetServicesDir)
          ? builderMeta.value.servicesDirs
          : [response.targetServicesDir, ...builderMeta.value.servicesDirs],
      }
    }
    setGeneratedFiles(response.files, activeService.value.id)
    previewMode.value = 'generated'
    previewTab.value = 'files'
    syncMessage.value = 'Dry-run généré sur le dossier cible configuré'
    lastAction.value = 'dry-run'
    notify('info', 'Preview multi-fichiers générée')
  }
  catch (error) {
    console.error('[NFZ builder] dry-run failed', error)
    notify('negative', 'Dry-run impossible')
  }
  finally {
    dryRunBusy.value = false
  }
}

async function applyActive() {
  applyBusy.value = true
  try {
    const response = await $fetch<{ ok: boolean, outputDir: string, targetServicesDir?: string, files: { path: string, language: string, content: string }[], fileCount?: number, writtenAt?: string, rootBarrelServices?: string[] }>('/api/builder/apply', {
      method: 'POST',
      body: { service: activeService.value, services: services.value },
    })
    if (response.targetServicesDir) {
      builderMeta.value = {
        ...builderMeta.value,
        primaryServicesDir: response.targetServicesDir,
        servicesDirs: builderMeta.value.servicesDirs.includes(response.targetServicesDir)
          ? builderMeta.value.servicesDirs
          : [response.targetServicesDir, ...builderMeta.value.servicesDirs],
      }
    }
    setGeneratedFiles(response.files, activeService.value.id)
    previewMode.value = 'generated'
    applyResult.value = {
      outputDir: response.outputDir,
      targetServicesDir: response.targetServicesDir,
      files: response.files,
      fileCount: response.fileCount ?? response.files.length,
      writtenAt: response.writtenAt,
      rootBarrelServices: response.rootBarrelServices || [],
    }
    previewTab.value = 'files'
    syncMessage.value = 'Apply écrit directement dans le dossier services configuré'
    lastAction.value = 'apply'
    notify('positive', `${response.fileCount ?? response.files.length} fichier(s) généré(s) dans ${response.targetServicesDir || builderMeta.value.primaryServicesDir}`)
    await loadServer({ silent: true, preserveSelection: true })
  }
  catch (error) {
    console.error('[NFZ builder] apply failed', error)
    notify('negative', 'Apply impossible')
  }
  finally {
    applyBusy.value = false
  }
}

function touch(service?: BuilderServiceManifest) {
  const target = service || activeService.value
  if (target)
    target.updatedAt = new Date().toISOString()
}

function applyIdFieldPreset(value: '_id' | 'id') {
  activeService.value.idField = value
  touch()
}

function syncIdFieldWithAdapter(adapter: string) {
  const current = String(activeService.value.idField || '').trim()
  if (adapter === 'mongodb') {
    if (!current || current === 'id')
      activeService.value.idField = '_id'
  }
  else if (!current || current === '_id') {
    activeService.value.idField = 'id'
  }
}

function pushService(service: BuilderServiceManifest) {
  services.value = [service, ...services.value]
  activeId.value = service.id
  touch(service)
}

function addService() {
  const idx = services.value.length + 1
  const next = createService({
    name: `service-${idx}`,
    path: `service-${idx}`,
    collection: `service-${idx}`,
    originKind: 'draft',
  })
  pushService(next)
}

function createDemoServiceFromPreset(preset: BuilderPresetId) {
  const seeded = applyBuilderPreset(createService({
    name: `${preset}-demo`,
    path: `${preset}-demo`,
    collection: `${preset}-demo`,
    originKind: 'demo',
  }), preset)
  const next = createService({ ...seeded, originKind: 'demo' })
  pushService(next)
  syncSource.value = 'local'
  syncMessage.value = `Démo builder créée : ${preset}`
  lastAction.value = 'import'
}

function createDemoServiceFromStarter(starter: BuilderStarterId) {
  const seeded = applyBuilderStarter(createService({ originKind: 'demo' }), starter)
  const next = createService({ ...seeded, originKind: 'demo' })
  pushService(next)
  syncSource.value = 'local'
  syncMessage.value = `Démo builder créée : ${starter}`
  lastAction.value = 'import'
}

function duplicateService(id: string) {
  const service = services.value.find(item => item.id === id)
  if (!service) return
  const next = createService({
    ...JSON.parse(JSON.stringify(service)),
    id: undefined,
    name: `${service.name}-copy`,
    path: `${service.path}-copy`,
    collection: `${service.collection}-copy`,
    originKind: service.originKind || 'draft',
  })
  services.value = [next, ...services.value]
  activeId.value = next.id
  touch(next)
}

function removeService(id: string) {
  services.value = services.value.filter(item => item.id !== id)
  if (!services.value.length)
    services.value = [createService()]
  if (!services.value.find(item => item.id === activeId.value))
    activeId.value = services.value.at(0)?.id || ''
}

function syncNameToPath(service: BuilderServiceManifest) {
  const slug = slugify(service.name)
  service.path = slug
  service.collection = slug
  touch(service)
}

function addField() {
  activeService.value.fields.push(createField({ name: `field_${activeService.value.fields.length + 1}` }))
  touch()
}

function removeField(id: string) {
  activeService.value.fields = activeService.value.fields.filter(field => field.id !== id)
  touch()
}

function resetBuilder() {
  services.value = [createService()]
  activeId.value = services.value.at(0)?.id || ''
  importPayload.value = ''
  applyResult.value = null
  generatedFiles.value = []
  generatedFilesOwnerId.value = ''
  syncSource.value = 'local'
  syncMessage.value = 'Builder réinitialisé'
  lastAction.value = 'reset'
}

function requestDeleteActive() {
  deleteConfirmOpen.value = true
}

function confirmDeleteActive() {
  removeService(activeId.value)
  deleteConfirmOpen.value = false
}

function requestResetBuilder() {
  resetConfirmOpen.value = true
}

function confirmResetBuilder() {
  resetBuilder()
  resetConfirmOpen.value = false
  notify('warning', 'Builder réinitialisé')
}

function requestApplyActive() {
  applyConfirmOpen.value = true
}

async function confirmApplyActive() {
  applyConfirmOpen.value = false
  await applyActive()
}

function handleTreeSelected(key: string | null) {
  if (typeof key === 'string' && key.startsWith('svc:')) {
    activeId.value = key.slice(4)
  }
}

function exportManifest() {
  const content = JSON.stringify(services.value, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = 'nfz-service-builder-manifest.json'
  link.click()
  URL.revokeObjectURL(href)
}

function importManifest() {
  try {
    services.value = normalizeManifest(JSON.parse(importPayload.value))
    activeId.value = services.value[0]?.id || ''
    syncSource.value = 'local'
    syncMessage.value = 'Manifest importé'
    lastAction.value = 'import'
    notify('positive', 'Manifest importé')
  }
  catch (error) {
    console.error('[NFZ builder] manifest import failed', error)
    notify('negative', 'Import manifest invalide')
  }
}

function setMethodsFromInput(value: string | number | null) {
  activeService.value.methods = normalizeMethods(String(value || '').split(','))
  activeService.value.customMethods = activeService.value.methods.filter(method => !NATIVE_METHODS.includes(method as any))
  touch()
}

function toggleMethod(method: string) {
  const set = new Set(activeService.value.methods)
  if (set.has(method)) set.delete(method)
  else set.add(method)
  activeService.value.methods = normalizeMethods([...set])
  activeService.value.customMethods = activeService.value.methods.filter(item => !NATIVE_METHODS.includes(item as any))
  touch()
}

function applyMethodPreset(methods: string[]) {
  activeService.value.methods = normalizeMethods(methods)
  activeService.value.customMethods = activeService.value.methods.filter(item => !NATIVE_METHODS.includes(item as any))
  touch()
}

function setCrudPreset() {
  applyMethodPreset(['find', 'get', 'create', 'patch', 'remove'])
}

function setCreateOnlyPreset() {
  applyMethodPreset(['create'])
}

function setCustomOnlyPreset() {
  applyMethodPreset(activeService.value.customMethods.length ? activeService.value.customMethods : ['create'])
}

function alignToDetectedProfile() {
  const profile = inferServiceProfile(activeService.value)
  if (profile === 'mongoAuth') applyServicePreset('mongoSecureCrud')
  else if (profile === 'memoryCrud') applyServicePreset('memoryCrud')
  else if (profile === 'actionCustom' || profile === 'customService') applyServicePreset('action')
  else applyServicePreset('mongoCrud')
}


function getRoutePreset(value: unknown): BuilderPresetId | null {
  const preset = String(Array.isArray(value) ? value[0] : value || '').trim()
  return ['mongoCrud', 'mongoSecureCrud', 'memoryCrud', 'action'].includes(preset)
    ? preset as BuilderPresetId
    : null
}

function getRouteStarter(value: unknown): BuilderStarterId | null {
  const starter = String(Array.isArray(value) ? value[0] : value || '').trim()
  return ['users', 'articles', 'jobs', 'commands'].includes(starter)
    ? starter as BuilderStarterId
    : null
}

function applyPresetFromRoute() {
  const preset = getRoutePreset(route.query.preset)
  const key = preset ? `preset:${preset}` : ''
  if (!preset || lastRouteApplyKey.value === key) return
  createDemoServiceFromPreset(preset)
  mainPanelTab.value = 'presets'
  lastRouteApplyKey.value = key
}

function applyStarterFromRoute() {
  const starter = getRouteStarter(route.query.starter)
  const key = starter ? `starter:${starter}` : ''
  if (!starter || lastRouteApplyKey.value === key) return
  createDemoServiceFromStarter(starter)
  mainPanelTab.value = 'presets'
  lastRouteApplyKey.value = key
}

function applyServicePreset(preset: BuilderPresetId) {
  const nextService = applyBuilderPreset(activeService.value, preset)
  const target = services.value.find(service => service.id === activeService.value.id)
  if (target) Object.assign(target, { ...nextService, originKind: target.originKind || nextService.originKind || 'draft' })
  syncMessage.value = `Preset appliqué : ${preset}`
  touch()
}

function applyServiceStarter(starter: BuilderStarterId) {
  const nextService = applyBuilderStarter(activeService.value, starter)
  const target = services.value.find(service => service.id === activeService.value.id)
  if (target) Object.assign(target, { ...nextService, originKind: target.originKind || 'demo' })
  syncMessage.value = `Starter appliqué : ${starter}`
  touch()
}

function openPresetsTab() {
  mainPanelTab.value = 'presets'
}

function setOriginFilter(value: 'all' | 'demo' | 'scanned' | 'draft') {
  originFilter.value = value
  if (value === 'demo') experienceMode.value = 'quickTests'
  else if (value === 'scanned') experienceMode.value = 'realServices'
  else experienceMode.value = 'advanced'
}

function applyExperienceMode(value: 'quickTests' | 'realServices' | 'advanced') {
  experienceMode.value = value
  if (value === 'quickTests') {
    originFilter.value = 'demo'
    mainPanelTab.value = 'presets'
    search.value = ''
    if (!demoCount.value) createDemoServiceFromStarter('users')
    return
  }
  if (value === 'realServices') {
    originFilter.value = 'scanned'
    mainPanelTab.value = scannedCount.value ? 'workspace' : 'workflow'
    workspaceTab.value = 'preview'
    previewMode.value = 'source'
    search.value = ''
    if (!scannedCount.value) notify('info', 'Aucun service scanné pour le moment. Charge le workspace puis réessaie.')
    return
  }
  originFilter.value = 'all'
  mainPanelTab.value = 'workspace'
  workspaceTab.value = 'builder'
  previewMode.value = 'generated'
}

function openGuidedEntry(mode: 'quickTests' | 'realServices' | 'advanced') {
  applyExperienceMode(mode)
  if (mode === 'quickTests') {
    syncMessage.value = 'Entrée guidée : tests rapides'
    return
  }
  if (mode === 'realServices') {
    syncMessage.value = scannedCount.value
      ? 'Entrée guidée : services réels'
      : 'Entrée guidée : aucun service scanné disponible pour le moment';
    return
  }
  syncMessage.value = 'Entrée guidée : builder avancé'
}
async function copyToClipboard(value: string, label = 'Contenu copié') {
  try {
    await navigator.clipboard.writeText(value)
    notify('positive', label)
  }
  catch (error) {
    console.error('[NFZ builder] clipboard failed', error)
    notify('warning', 'Copie impossible depuis le navigateur')
  }
}

const filteredServices = computed(() => {
  const q = search.value.trim().toLowerCase()
  return services.value.filter((service) => {
    const matchesOrigin = originFilter.value === 'all' || getServiceOriginKind(service) === originFilter.value
    if (!matchesOrigin) return false
    if (!q) return true
    return [service.name, service.path, service.collection, service.schemaMode, getServiceFsName(service)]
      .some(value => String(value).toLowerCase().includes(q))
  })
})

const selectedTreeKey = computed(() => activeId.value ? `svc:${activeId.value}` : '')

const serviceTreeNodes = computed<ServiceTreeNode[]>(() => {
  const toNode = (service: BuilderServiceManifest): ServiceTreeNode => ({
    key: `svc:${service.id}`,
    kind: 'service',
    label: service.name,
    icon: getServiceOriginKind(service) === 'scanned' ? 'travel_explore' : getServiceOriginKind(service) === 'demo' ? 'science' : 'edit_note',
    caption: `/${service.path} · ${getServiceFsName(service)}`,
    scan: getServiceOriginKind(service) === 'scanned',
    adapter: service.adapter,
    schemaMode: service.schemaMode,
    hookPresetLabel: hookPresetOptions.find(option => option.value === service.hookPreset)?.label || service.hookPreset,
    profileLabel: getServiceProfileMeta(service).label,
    auth: service.auth,
  })

  const scanned = filteredServices.value.filter(service => getServiceOriginKind(service) === 'scanned').map(toNode)
  const demos = filteredServices.value.filter(service => getServiceOriginKind(service) === 'demo').map(toNode)
  const drafts = filteredServices.value.filter(service => getServiceOriginKind(service) === 'draft').map(toNode)
  const groups: ServiceTreeNode[] = []

  if (demos.length) {
    groups.push({
      key: 'group-demo',
      kind: 'group',
      label: 'Démo builder',
      icon: 'science',
      count: demos.length,
      caption: 'Presets et starters pour tests simples',
      children: demos,
    })
  }

  if (scanned.length) {
    groups.push({
      key: 'group-scanned',
      kind: 'group',
      label: 'Services scannés',
      icon: 'travel_explore',
      count: scanned.length,
      caption: 'Sources réelles chargées depuis le workspace',
      children: scanned,
    })
  }

  if (drafts.length) {
    groups.push({
      key: 'group-drafts',
      kind: 'group',
      label: 'Brouillons libres',
      icon: 'edit_note',
      count: drafts.length,
      caption: 'Services locaux créés manuellement',
      children: drafts,
    })
  }

  return groups
})

const activeService = computed<BuilderServiceManifest>(() => {
  const found = services.value.find(service => service.id === activeId.value)
  return found || services.value[0] || createService()
})

const activeSourceFiles = computed(() => sourceFilesById.value[activeService.value.id] || [])
const sourceSharedFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'shared') || null)
const sourceClassFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'class') || null)
const sourceSchemaFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'schema') || null)
const sourceServiceFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'service') || null)
const sourceHooksFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'hooks') || (activeService.value.hooksFileMode === 'separate' ? null : sourceServiceFile.value) || null)
const sourceBarrelFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'barrel') || null)
const sourceRootBarrelFile = computed(() => activeSourceFiles.value.find(file => file.kind === 'root-barrel') || null)
const generatedPlan = computed(() => buildGeneratedFiles(activeService.value, targetServicesDir.value, { allServices: services.value }))
const generatedFileList = computed(() => generatedFiles.value.length && generatedFilesOwnerId.value === activeService.value.id
  ? generatedFiles.value
  : generatedPlan.value)
const generatedSharedFile = computed(() => generatedFileList.value.find(file => /\.shared\.[cm]?[jt]s$/.test(file.path)) || null)
const generatedClassFile = computed(() => generatedFileList.value.find(file => /\.class\.[cm]?[jt]s$/.test(file.path)) || null)
const generatedSchemaFile = computed(() => generatedFileList.value.find(file => /\.schema\.[cm]?[jt]s$/.test(file.path)) || null)
const generatedServiceFile = computed(() => generatedFileList.value.find(file => /\.ts$/.test(file.path) && !(/\.(schema|shared|class|hooks)\.[cm]?[jt]s$/.test(file.path) || /\/index\.[cm]?[jt]s$/.test(file.path))) || null)
const generatedBarrelFile = computed(() => generatedFileList.value.find(file => /\/[^/]+\/index\.[cm]?[jt]s$/.test(file.path)) || null)
const generatedRootBarrelFile = computed(() => generatedFileList.value.find(file => /(^|\/)index\.[cm]?[jt]s$/.test(file.path) && !/\/[^/]+\/index\.[cm]?[jt]s$/.test(file.path)) || null)
const previewUsesSource = computed(() => previewMode.value === 'source' && activeSourceFiles.value.length > 0)
const fileList = computed(() => previewUsesSource.value
  ? activeSourceFiles.value.map(file => ({ path: file.path, language: file.language, content: file.content }))
  : generatedFileList.value)

const diffRecords = computed<BuilderDiffRecord[]>(() => {
  const comparableSourceFiles = activeSourceFiles.value
  const sourceMap = new Map(comparableSourceFiles.map(file => [getCompareKey(file), file]))
  const generatedMap = new Map(generatedFileList.value.map(file => [getCompareKey({ path: file.path }), file]))
  const keys = [...new Set([...sourceMap.keys(), ...generatedMap.keys()])]

  return keys.map((key) => {
    const source = sourceMap.get(key)
    const generated = generatedMap.get(key)
    const sourceContent = source?.content || ''
    const generatedContent = generated?.content || ''
    const diff = buildUnifiedDiff(sourceContent, generatedContent, source?.path || `${key}:source`, generated?.path || `${key}:generated`)
    const status: BuilderDiffRecord['status'] = !source && generated
      ? 'new'
      : source && !generated
        ? 'removed'
        : diff.changed
          ? 'modified'
          : 'same'

    return {
      key,
      label: getCompareLabel(key, source?.path, generated?.path),
      status,
      language: generated?.language || source?.language || 'ts',
      sourcePath: source?.path,
      generatedPath: generated?.path,
      sourceContent,
      generatedContent,
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      diffText: diff.diffText,
    }
  }).sort((a, b) => {
    const order: Record<BuilderDiffRecord['status'], number> = { modified: 0, new: 1, removed: 2, same: 3 }
    return (order[a.status] - order[b.status]) || a.label.localeCompare(b.label)
  })
})
const modifiedDiffCount = computed(() => diffRecords.value.filter(record => record.status !== 'same').length)
const activeDiffRecord = computed(() => diffRecords.value.find(record => record.key === diffSelectedKey.value) || diffRecords.value[0] || null)

const manifestPreview = computed(() => JSON.stringify({
  ...activeService.value,
  fsName: getServiceFsName(activeService.value),
  sourceFiles: activeSourceFiles.value.map(file => ({ path: file.path, kind: file.kind })),
  generatedPlan: generatedPlan.value.map(file => ({ path: file.path, language: file.language })),
  diffSummary: diffRecords.value.map(record => ({ label: record.label, status: record.status, changed: record.changed })),
  previewMode: previewMode.value,
  targetServicesDir: builderMeta.value.primaryServicesDir,
  rootBarrelServices: rootBarrelServicePaths.value,
}, null, 2))
const sharedPreview = computed(() => previewUsesSource.value && sourceSharedFile.value ? sourceSharedFile.value.content : (generatedSharedFile.value?.content || generatedPlan.value.find(file => /\.shared\.[cm]?[jt]s$/.test(file.path))?.content || ''))
const classPreview = computed(() => previewUsesSource.value && sourceClassFile.value ? sourceClassFile.value.content : (generatedClassFile.value?.content || generatedPlan.value.find(file => /\.class\.[cm]?[jt]s$/.test(file.path))?.content || ''))
const schemaPreview = computed(() => previewUsesSource.value && sourceSchemaFile.value ? sourceSchemaFile.value.content : (generatedSchemaFile.value?.content || buildSchemaPreview(activeService.value)))
const servicePreview = computed(() => previewUsesSource.value && sourceServiceFile.value ? sourceServiceFile.value.content : (generatedServiceFile.value?.content || buildServicePreview(activeService.value)))
const hooksPreview = computed(() => previewUsesSource.value && sourceHooksFile.value ? sourceHooksFile.value.content : buildHooksPreview(activeService.value))
const barrelPreview = computed(() => previewUsesSource.value && sourceBarrelFile.value ? sourceBarrelFile.value.content : (generatedBarrelFile.value?.content || ''))
const rootBarrelServices = computed(() => services.value.filter(service => service.barrelMode === 'service+root'))
const rootBarrelServicePaths = computed(() => rootBarrelServices.value.map(service => service.path))
const rootBarrelPreview = computed(() => previewUsesSource.value && sourceRootBarrelFile.value ? sourceRootBarrelFile.value.content : (generatedRootBarrelFile.value?.content || buildRootBarrelPreviewForServices(rootBarrelServices.value, activeService.value)))
const activeGeneratedFile = computed(() => fileList.value.find(file => file.path === filePreviewPath.value) || fileList.value[0] || null)
const methodsInput = computed(() => activeService.value.methods.join(', '))
function getServiceOriginKind(service: BuilderServiceManifest): BuilderServiceOriginKind {
  if ((sourceFilesById.value[service.id] || []).length > 0) return 'scanned'
  return service.originKind || 'draft'
}

function getServiceOriginLabel(service: BuilderServiceManifest) {
  const origin = getServiceOriginKind(service)
  if (origin === 'scanned') return 'service scanné'
  if (origin === 'demo') return 'démo builder'
  return 'brouillon libre'
}

const scannedCount = computed(() => services.value.filter(service => getServiceOriginKind(service) === 'scanned').length)
const demoCount = computed(() => services.value.filter(service => getServiceOriginKind(service) === 'demo').length)
const draftCount = computed(() => services.value.filter(service => getServiceOriginKind(service) === 'draft').length)
const filteredTotalCount = computed(() => filteredServices.value.length)
const filteredScannedCount = computed(() => filteredServices.value.filter(service => getServiceOriginKind(service) === 'scanned').length)
const filteredDemoCount = computed(() => filteredServices.value.filter(service => getServiceOriginKind(service) === 'demo').length)
const filteredDraftCount = computed(() => filteredServices.value.filter(service => getServiceOriginKind(service) === 'draft').length)
const originFilterLabel = computed(() => {
  if (originFilter.value === 'demo') return 'Démo builder'
  if (originFilter.value === 'scanned') return 'Services scannés'
  if (originFilter.value === 'draft') return 'Brouillons libres'
  return 'Tous les services'
})
const experienceModeLabel = computed(() => {
  if (experienceMode.value === 'quickTests') return 'Tests rapides'
  if (experienceMode.value === 'realServices') return 'Services réels'
  return 'Builder avancé'
})
const experienceModeCopy = computed(() => {
  if (experienceMode.value === 'quickTests') return 'Vue guidée pour lancer vite une démo builder, un starter ou un preset sans toucher aux services réels.'
  if (experienceMode.value === 'realServices') return 'Vue focalisée sur les services réellement scannés pour vérifier le source, le preview et les tests simples.'
  return 'Vue complète pour éditer tous les services, comparer, générer et appliquer comme dans un vrai workflow NFZ.'
})
const activeScenarioMeta = computed(() => {
  if (experienceMode.value === 'quickTests') {
    return {
      icon: 'science',
      color: 'secondary',
      title: 'Tests rapides',
      copy: 'Ouvre les presets et les démos builder sans toucher aux services réels.',
      tags: ['presets', 'starters', 'démo builder'],
      actionLabel: 'Lancer les tests rapides',
    }
  }
  if (experienceMode.value === 'realServices') {
    return {
      icon: 'travel_explore',
      color: 'primary',
      title: 'Services réels',
      copy: "Focalise l'écran sur les services scannés, la preview source et les vérifications simples.",
      tags: ['scan workspace', 'preview source', 'tests simples'],
      actionLabel: 'Inspecter les services réels',
    }
  }
  return {
    icon: 'construction',
    color: 'accent',
    title: 'Builder avancé',
    copy: 'Accède au builder complet pour éditer, comparer, générer et appliquer.',
    tags: ['builder', 'diff', 'apply'],
    actionLabel: 'Ouvrir le builder avancé',
  }
})
const scenarioCardsVisible = computed(() => mainPanelTab.value === 'workflow')
const mainPanelSummary = computed(() => {
  if (mainPanelTab.value === 'presets') return 'Choisis un preset ou un starter, puis passe au workspace pour prévisualiser et appliquer.'
  if (mainPanelTab.value === 'workspace') return 'Travaille sur le service actif avec seulement les outils utiles au mode courant.'
  return 'Commence par choisir un scénario simple, puis passe au service actif.'
})
function resolveWorkspaceTabOptions() {
  if (experienceMode.value === 'quickTests') return [
    { name: 'tests', icon: 'science', label: 'Tests méthodes', tone: 'accent' },
  ] as const
  if (experienceMode.value === 'realServices') return [
    { name: 'preview', icon: 'preview', label: 'Preview source', tone: 'secondary' },
    { name: 'tests', icon: 'science', label: 'Tests méthodes', tone: 'accent' },
  ] as const
  return [
    { name: 'builder', icon: 'schema', label: 'Schema Builder', tone: 'primary' },
    { name: 'preview', icon: 'preview', label: 'Preview Generator', tone: 'secondary' },
    { name: 'tests', icon: 'science', label: 'Tests méthodes', tone: 'accent' },
  ] as const
}
const workspaceTabOptions = computed(() => resolveWorkspaceTabOptions())
const workspaceTabNames = computed(() => resolveWorkspaceTabOptions().map(tab => tab.name))
watch(() => experienceMode.value, () => {
  const names = resolveWorkspaceTabOptions().map(option => option.name as 'builder' | 'preview' | 'tests')
  if (!names.includes(workspaceTab.value)) workspaceTab.value = names[0] || 'builder'
}, { immediate: true })
const workspaceTitle = computed(() => {
  if (experienceMode.value === 'quickTests') return 'Tests rapides'
  if (experienceMode.value === 'realServices') return 'Preview source / Tests'
  return 'Builder / Preview / Tests'
})
const workspaceCopy = computed(() => {
  if (experienceMode.value === 'quickTests') return 'Teste la forme des requêtes et réponses sans parcourir tout le builder.'
  if (experienceMode.value === 'realServices') return 'Inspecte le source réel et valide les méthodes sans distraire la lecture.'
  return 'Accède au builder complet, à la prévisualisation multi-fichiers et aux tests de méthodes.'
})
const activeServiceFsName = computed(() => getServiceFsName(activeService.value))
const targetServicesDir = computed(() => builderMeta.value.primaryServicesDir || 'services')
const targetServiceDir = computed(() => `${targetServicesDir.value}/${activeServiceFsName.value}`)
const activeSourceKinds = computed(() => [...new Set(activeSourceFiles.value.map(file => file.kind))])
const generatedClassName = computed(() => getGeneratedClassName(activeService.value))
const generatedRegisterName = computed(() => getRegisterFunctionName(activeService.value))
const generatedSharedBase = computed(() => getSharedBaseName(activeService.value))
const generatedSchemaBase = computed(() => getSchemaBaseName(activeService.value))
const collectionLikeLabel = computed(() => isCollectionLike(activeService.value) ? 'collection-like' : 'custom/create-only')
const generationProfile = computed(() => inferServiceProfile(activeService.value))
const generationProfileMeta = computed(() => getServiceProfileMeta(activeService.value))
const generationProfileLabel = computed(() => generationProfileMeta.value.label)
const generationProfileHint = computed(() => generationProfileMeta.value.hint)
const hookPresetLabel = computed(() => hookPresetOptions.find(option => option.value === activeService.value.hookPreset)?.label || activeService.value.hookPreset)
const hookPlanSummary = computed(() => {
  switch (activeService.value.hookPreset) {
    case 'action':
      return 'around resolvers + before query/data + after/error helpers'
    case 'custom':
      return 'base resolvers + customCode piloté manuellement'
    default:
      return activeService.value.auth
        ? 'around resolvers + before query + authenticate(jwt) + data resolvers'
        : 'around resolvers + before query/data standard NFZ'
  }
})
const activeStarterDefinition = computed(() => {
  const routeStarter = getRouteStarter(route.query.starter)
  const currentStarter = (activeService.value.starterId || '') as BuilderStarterId | ''
  return getBuilderStarterDefinition(routeStarter || currentStarter || 'users' as BuilderStarterId) && (routeStarter || currentStarter)
    ? getBuilderStarterDefinition((routeStarter || currentStarter) as BuilderStarterId)
    : null
})
const activePresetDefinition = computed(() => {
  const starterPreset = activeStarterDefinition.value?.presetId
  if (starterPreset) return getBuilderPresetDefinition(starterPreset)
  return getBuilderPresetDefinition(getRoutePreset(route.query.preset) || (generationProfile.value === 'mongoAuth' ? 'mongoSecureCrud' : generationProfile.value === 'memoryCrud' ? 'memoryCrud' : generationProfile.value === 'actionCustom' ? 'action' : 'mongoCrud')) || null
})
const presetFieldNames = computed(() => (activeStarterDefinition.value?.service.fields || activePresetDefinition.value?.service.fields || []).map(field => field.name))
const builderCliPreview = computed(() => {
  const adapter = activeService.value.adapter
  const schema = activeService.value.schemaMode
  const idField = activeService.value.idField
  const methods = activeService.value.methods.join(',')
  const authFlag = activeService.value.auth ? ' --auth' : ''
  const customFlag = adapter === 'custom' ? ` --custom --methods ${methods}${activeService.value.customMethods.length ? ` --customMethods ${activeService.value.customMethods.join(',')}` : ''}` : ` --methods ${methods}`
  const hooksFlag = activeService.value.hooksFileMode === 'separate' ? ' --hooks-file separate' : ''
  const barrelFlag = activeService.value.barrelMode !== 'none' ? ` --barrel ${activeService.value.barrelMode}` : ''
  const starterFlag = activeStarterDefinition.value ? ` # starter:${activeStarterDefinition.value.id}` : ''
  return `bunx nuxt-feathers-zod add service ${activeServiceFsName.value}${authFlag} --adapter ${adapter} --schema ${schema} --collection ${activeService.value.collection} --idField ${idField}${customFlag}${hooksFlag}${barrelFlag}${starterFlag}`
})
const applyChecklist = computed(() => [
  `servicesDir = ${targetServicesDir.value}`,
  `serviceDir = ${targetServiceDir.value}`,
  `methods = ${activeService.value.methods.join(', ') || 'none'}`,
  `idField = ${activeService.value.idField}`,
  `hooks = ${activeService.value.hooksFileMode}`,
  `barrels = ${activeService.value.barrelMode}`,
  `rootBarrelExports = ${rootBarrelServicePaths.value.length}`,
  ...(activeStarterDefinition.value ? [`starter = ${activeStarterDefinition.value.id}`] : []),
  `fields = ${activeService.value.fields.length}`,
])
const layoutPreviewRows = computed(() => generatedPlan.value.map(file => ({
  label: getCompareLabel(getCompareKey({ path: file.path }), file.path, file.path),
  path: file.path,
  kind: getFileKindFromPath(file.path),
})))
const fileCount = computed(() => fileList.value.length)
const idFieldHint = computed(() => activeService.value.adapter === 'mongodb'
  ? "MongoDB utilise généralement '_id' pour la clé primaire."
  : "Les services memory/custom exposent le plus souvent 'id' comme identifiant.")
const hooksFileModeLabel = computed(() => hooksFileModeOptions.find(option => option.value === activeService.value.hooksFileMode)?.label || activeService.value.hooksFileMode)
const barrelModeLabel = computed(() => barrelModeOptions.find(option => option.value === activeService.value.barrelMode)?.label || activeService.value.barrelMode)
const rootBarrelSummary = computed(() => rootBarrelServicePaths.value.length
  ? `${rootBarrelServicePaths.value.length} service(s) exporté(s) dans services/index.ts`
  : 'Aucun service agrégé dans services/index.ts')
const builderWarnings = computed(() => {
  const warnings: string[] = []
  if (!activeService.value.methods.length) warnings.push('Aucune méthode exposée : le service ne sera pas appelable.')
  if (activeService.value.adapter !== 'custom' && !activeService.value.fields.length) warnings.push('Aucun champ détecté : complète le schéma avant apply.')
  if (activeService.value.hookPreset === 'action' && isCollectionLike(activeService.value)) warnings.push("Profil hooks Action avec un service collection-like : vérifie que ce n'est pas un CRUD classique.")
  if (activeService.value.hookPreset !== 'action' && activeService.value.methods.length === 1 && activeService.value.methods[0] === 'create') warnings.push('Service create-only détecté : le profil hooks Action sera souvent plus cohérent.')
  if (activeService.value.path === activeServiceFsName.value) warnings.push("Path Feathers et nom de dossier identiques : correct si voulu, mais sépare-les si l'endpoint doit rester stable.")
  if (activeService.value.hooksFileMode === 'separate' && activeService.value.hookPreset === 'custom') warnings.push('Hooks séparés + profil custom : pense à garder le fichier .hooks focalisé sur la registration des hooks.')
  if (activeService.value.barrelMode === 'service+root') warnings.push(`Le mode service+root écrit un services/index.ts agrégé sur ${rootBarrelServicePaths.value.length || 1} service(s) déclarés en root barrel.`)
  if (activeStarterDefinition.value?.id === 'users') warnings.push('Starter users : vérifie la stratégie locale et le service authentication pour exploiter passwordHash côté schéma.')
  return warnings
})
const previewOrigin = computed(() => previewUsesSource.value ? 'source' : (generatedFilesOwnerId.value === activeService.value.id && generatedFiles.value.length ? 'generated:server' : 'generated:local'))
const previewModeLabel = computed(() => {
  if (previewUsesSource.value) return 'Source réel'
  return previewOrigin.value === 'generated:server' ? 'Génération serveur' : 'Génération locale'
})
const currentPreviewContent = computed(() => {
  switch (previewTab.value) {
    case 'manifest': return manifestPreview.value
    case 'shared': return sharedPreview.value
    case 'class': return classPreview.value
    case 'schema': return schemaPreview.value
    case 'service': return servicePreview.value
    case 'hooks': return hooksPreview.value
    case 'barrel': return barrelPreview.value || '// Barrel désactivé'
    case 'rootBarrel': return rootBarrelPreview.value || '// Root barrel désactivé'
    case 'custom': return activeService.value.customCode
    case 'diff': return activeDiffRecord.value?.diffText || '// Aucun diff disponible'
    default: return activeGeneratedFile.value?.content || '// Aucun fichier à afficher'
  }
})
const currentPreviewLabel = computed(() => {
  switch (previewTab.value) {
    case 'manifest': return 'Manifest'
    case 'shared': return previewUsesSource.value && sourceSharedFile.value ? sourceSharedFile.value.path : `${targetServiceDir.value}/${activeServiceFsName.value}.shared.ts`
    case 'class': return previewUsesSource.value && sourceClassFile.value ? sourceClassFile.value.path : `${targetServiceDir.value}/${activeServiceFsName.value}.class.ts`
    case 'schema': return previewUsesSource.value && sourceSchemaFile.value ? sourceSchemaFile.value.path : `${targetServiceDir.value}/${activeServiceFsName.value}.schema.ts`
    case 'service': return previewUsesSource.value && sourceServiceFile.value ? sourceServiceFile.value.path : `${targetServiceDir.value}/${activeServiceFsName.value}.ts`
    case 'hooks': return previewUsesSource.value && sourceHooksFile.value ? sourceHooksFile.value.path : (activeService.value.hooksFileMode === 'separate' ? `${targetServiceDir.value}/${activeServiceFsName.value}.hooks.ts` : `${targetServiceDir.value}/${activeServiceFsName.value}.ts#hooks`)
    case 'barrel': return previewUsesSource.value && sourceBarrelFile.value ? sourceBarrelFile.value.path : `${targetServiceDir.value}/index.ts`
    case 'rootBarrel': return previewUsesSource.value && sourceRootBarrelFile.value ? sourceRootBarrelFile.value.path : `${targetServicesDir.value}/index.ts`
    case 'custom': return 'customCode'
    case 'diff': return activeDiffRecord.value ? `${activeDiffRecord.value.label} · ${activeDiffRecord.value.status}` : 'Diff source ↔ généré'
    default: return activeGeneratedFile.value?.path || 'Aucun fichier'
  }
})

function safeParseJson(value: string) {
  try {
    return JSON.parse(String(value || '').trim() || '{}')
  }
  catch {
    return { _raw: value, _parseError: true }
  }
}

const testMethodOptions = computed(() => {
  const methods = activeService.value.methods.length ? activeService.value.methods : [...NATIVE_METHODS]
  return methods.map(method => ({ label: method, value: method }))
})

watch(testMethodOptions, () => {
  const allowed = testMethodOptions.value.map(option => option.value)
  if (!allowed.includes(testMethod.value)) testMethod.value = allowed[0] || 'find'
}, { immediate: true })

const testRestPath = computed(() => `/feathers/${activeService.value.path}`)
const testRequestPreview = computed(() => {
  const method = testMethod.value
  const payload = safeParseJson(testPayload.value)
  const query = safeParseJson(testQuery.value)
  if (method === 'find') return JSON.stringify({ method, service: activeService.value.path, params: { query } }, null, 2)
  if (method === 'get') return JSON.stringify({ method, service: activeService.value.path, id: '<id>', params: { query } }, null, 2)
  return JSON.stringify({ method, service: activeService.value.path, data: payload, params: { query } }, null, 2)
})
const testCurlPreview = computed(() => {
  const method = testMethod.value
  const payload = JSON.stringify(safeParseJson(testPayload.value), null, 2)
  const payloadEscaped = payload.replace(/'/g, "\\'")
  const query = encodeURIComponent(JSON.stringify(safeParseJson(testQuery.value)))
  if (method === 'find') return `curl "${testRestPath.value}?query=${query}"`
  if (method === 'get') return `curl "${testRestPath.value}/<id>?query=${query}"`
  return `curl -X POST "${testRestPath.value}?method=${method}" -H "Content-Type: application/json" -d '${payloadEscaped}'`
})
const testResultPreview = computed(() => JSON.stringify({
  service: activeService.value.path,
  method: testMethod.value,
  profile: generationProfileLabel.value,
  hookPreset: hookPresetLabel.value,
  requestShape: safeParseJson(testMethod.value === 'find' || testMethod.value === 'get' ? testQuery.value : testPayload.value),
  note: 'Prévisualisation locale de la forme de la requête. Intègre un appel réel plus tard si souhaité.'
}, null, 2))

const workflowStep = computed(() => {
  if (lastAction.value === 'apply' || applyResult.value?.outputDir) return 5
  if (lastAction.value === 'dry-run' || previewTab.value === 'diff' || previewTab.value === 'files') return 4
  if (['schema', 'service', 'hooks', 'custom'].includes(previewTab.value)) return 3
  if (activeId.value) return 2
  return 1
})

const workflowCaption = computed(() => {
  switch (workflowStep.value) {
    case 5: return 'Apply prêt ou exécuté sur le dossier cible.'
    case 4: return 'Comparaison et génération prêtes avant écriture.'
    case 3: return 'Édition du manifest et du code en cours.'
    case 2: return 'Service sélectionné, prêt à être édité.'
    default: return 'Charge ou scanne un workspace pour commencer.'
  }
})
const workflowNodes = computed(() => ([
  { name: 1, title: 'Scanner', caption: 'Workspace', icon: 'travel_explore' },
  { name: 2, title: 'Sélectionner', caption: 'Service', icon: 'widgets' },
  { name: 3, title: 'Éditer', caption: 'Manifest', icon: 'edit_note' },
  { name: 4, title: 'Comparer', caption: 'Diff', icon: 'compare_arrows' },
  { name: 5, title: 'Apply', caption: 'Écriture', icon: 'publish' },
]))
function isScannedService(service: BuilderServiceManifest) {
  return (sourceFilesById.value[service.id] || []).length > 0
}

watch(services, () => persistLocal(), { deep: true })
watch([navSize, treeExpanded, mainPanelTab, workspaceTab, previewTab, previewMode, testsPreviewTab, originFilter, experienceMode], () => persistUi(), { deep: true })
watch([activeId, previewMode], () => {
  if (previewMode.value === 'source' && !activeSourceFiles.value.length) previewMode.value = 'generated'
  if (fileList.value.length && !fileList.value.some(file => file.path === filePreviewPath.value))
    filePreviewPath.value = fileList.value[0]?.path || ''
  else if (!fileList.value.length)
    filePreviewPath.value = ''
})

watch(diffRecords, () => {
  if (diffRecords.value.length && !diffRecords.value.some(record => record.key === diffSelectedKey.value))
    diffSelectedKey.value = diffRecords.value[0]?.key || ''
  else if (!diffRecords.value.length)
    diffSelectedKey.value = ''
}, { immediate: true })

watch(() => activeService.value.adapter, (adapter, previous) => {
  if (!adapter || adapter === previous) return
  syncIdFieldWithAdapter(adapter)
  touch()
})

watch(() => [route.query.preset, route.query.starter], () => {
  if (!import.meta.client) return
  if (!getRouteStarter(route.query.starter) && !getRoutePreset(route.query.preset)) lastRouteApplyKey.value = ''
  if (getRouteStarter(route.query.starter)) applyStarterFromRoute()
  else applyPresetFromRoute()
})

if (import.meta.client) {
  loadLocal()
  loadUi()
  void loadServer({ silent: true, preserveSelection: true }).finally(() => {
    if (getRouteStarter(route.query.starter)) applyStarterFromRoute()
    else applyPresetFromRoute()
  })
}

if (!services.value.length) {
  services.value = [createService()]
  activeId.value = services.value.at(0)?.id || ''
}
</script>

<template>
  <div class="builder-shell">
    <QSplitter v-model="navSize" unit="%" :limits="[20, 38]" style="height: min(88vh, 1300px)">
      <template #before>
        <section class="builder-sidebar">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="builder-kicker">Workspace</div>
              <h2 class="mt-1 builder-heading">Explorer services</h2>
              <div class="builder-copy">Sépare clairement les démos builder, les services scannés réels et les brouillons libres.</div>
            </div>
            <QBtn color="primary" unelevated icon="add" round size="md" @click="addService" />
          </div>

          <div class="grid gap-2.5">
            <div class="builder-stat-grid">
              <div class="builder-stat-card">
                <div class="builder-stat-label">Total</div>
                <div class="builder-stat-value">{{ services.length }}</div>
              </div>
              <div class="builder-stat-card">
                <div class="builder-stat-label">Démo builder</div>
                <div class="builder-stat-value">{{ demoCount }}</div>
              </div>
              <div class="builder-stat-card">
                <div class="builder-stat-label">Scannés</div>
                <div class="builder-stat-value">{{ scannedCount }}</div>
              </div>
              <div class="builder-stat-card">
                <div class="builder-stat-label">Brouillons</div>
                <div class="builder-stat-value">{{ draftCount }}</div>
              </div>
            </div>

            <div class="builder-soft-card px-3 py-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <div class="nfz-subtitle">Mode de vue</div>
                <QBadge outline color="grey-7">{{ experienceModeLabel }}</QBadge>
              </div>
              <div class="mt-2 text-xs nfz-subtitle">{{ experienceModeCopy }}</div>
              <QBtnToggle
                class="mt-3 w-full"
                spread
                unelevated
                no-caps
                toggle-color="primary"
                color="grey-3"
                text-color="dark"
                :model-value="experienceMode"
                :options="[
                  { label: 'Tests rapides', value: 'quickTests' },
                  { label: 'Services réels', value: 'realServices' },
                  { label: 'Builder avancé', value: 'advanced' },
                ]"
                @update:model-value="applyExperienceMode($event)"
              />
            </div>

            <QInput v-model="search" dense outlined label="Filtrer les services" clearable class="mongo-field" />
            <div class="flex flex-wrap gap-2">
              <QChip clickable :outline="originFilter !== 'all'" :color="originFilter === 'all' ? 'primary' : 'grey-7'" @click="setOriginFilter('all')">Tous · {{ services.length }}</QChip>
              <QChip clickable :outline="originFilter !== 'demo'" :color="originFilter === 'demo' ? 'secondary' : 'grey-7'" @click="setOriginFilter('demo')">Démo · {{ demoCount }}</QChip>
              <QChip clickable :outline="originFilter !== 'scanned'" :color="originFilter === 'scanned' ? 'primary' : 'grey-7'" @click="setOriginFilter('scanned')">Scannés · {{ scannedCount }}</QChip>
              <QChip clickable :outline="originFilter !== 'draft'" :color="originFilter === 'draft' ? 'accent' : 'grey-7'" @click="setOriginFilter('draft')">Brouillons · {{ draftCount }}</QChip>
            </div>
            <div class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] px-3 py-2 text-xs text-[var(--nfz-text-soft)]">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="font-medium text-[var(--nfz-text)]">Vue active</div>
                <QBadge outline color="grey-7">{{ originFilterLabel }}</QBadge>
              </div>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <div class="builder-meta-row"><span>Affichés</span><strong>{{ filteredTotalCount }}</strong></div>
                <div class="builder-meta-row"><span>Démo</span><strong>{{ filteredDemoCount }}</strong></div>
                <div class="builder-meta-row"><span>Scannés</span><strong>{{ filteredScannedCount }}</strong></div>
                <div class="builder-meta-row"><span>Brouillons</span><strong>{{ filteredDraftCount }}</strong></div>
              </div>
            </div>
          </div>

          <div class="builder-tree-shell">
            <QScrollArea class="h-full pr-1">
              <QTree
                :nodes="serviceTreeNodes"
                node-key="key"
                dense
                no-transition
                accordion
                :selected="selectedTreeKey"
                :expanded="treeExpanded"
                @update:selected="handleTreeSelected"
                @update:expanded="treeExpanded = [...$event]"
              >
                <template #default-header="prop">
                  <div v-if="prop.node.kind === 'group'" class="builder-node-group">
                    <QIcon :name="prop.node.icon || 'folder'" size="18px" class="q-mr-sm text-primary" />
                    <div class="min-w-0">
                      <div class="text-weight-medium">{{ prop.node.label }}</div>
                      <div v-if="prop.node.caption" class="text-[11px] nfz-subtitle">{{ prop.node.caption }}</div>
                    </div>
                    <QSpace />
                    <QBadge outline color="grey-7">{{ prop.node.count }}</QBadge>
                  </div>
                  <div v-else class="builder-node-service">
                    <QIcon :name="prop.node.icon || 'widgets'" size="18px" class="q-mt-xs text-primary" />
                    <div class="min-w-0 flex-1">
                      <div class="builder-node-title">{{ prop.node.label }}</div>
                      <div class="builder-node-caption">{{ prop.node.caption }}</div>
                      <div class="builder-chip-row">
                        <div class="col-auto"><span :class="prop.node.scan ? 'builder-chip-positive' : (getServiceOriginKind(services.find(service => `svc:${service.id}` === prop.node.key) || activeService) === 'demo' ? 'builder-chip-warning' : 'builder-chip')">{{ prop.node.scan ? 'scan' : (getServiceOriginKind(services.find(service => `svc:${service.id}` === prop.node.key) || activeService) === 'demo' ? 'démo' : 'brouillon') }}</span></div>
                        <div class="col-auto"><span class="builder-chip-primary">{{ prop.node.adapter }}</span></div>
                        <div class="col-auto"><span class="builder-chip">{{ prop.node.schemaMode }}</span></div>
                        <div class="col-auto" v-if="prop.node.auth"><span class="builder-chip-warning">auth</span></div>
                      </div>
                      <div class="mt-1 text-[11px] nfz-subtitle truncate">{{ prop.node.profileLabel }} · {{ prop.node.hookPresetLabel }}</div>
                    </div>
                  </div>
                </template>
              </QTree>
            </QScrollArea>
          </div>

          <QExpansionItem
            v-model="sidebarSyncOpen"
            dense
            dense-toggle
            expand-separator
            icon="sync"
            label="Synchronisation & source"
            header-class="builder-soft-card px-3 py-2 text-sm text-[var(--nfz-text)]"
            class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]"
          >
            <div class="px-3 pb-3 pt-1 grid gap-3">
              <div class="builder-action-grid">
                <QBtn :loading="loadBusy" unelevated no-caps color="secondary" icon="cloud_download" label="Charger" class="builder-action-btn" @click="loadServer({ preserveSelection: true })">
                  <QTooltip>Charger le manifest serveur</QTooltip>
                </QBtn>
                <QBtn :loading="saveBusy" unelevated no-caps color="primary" icon="cloud_upload" label="Sauver" class="builder-action-btn" @click="saveServer">
                  <QTooltip>Sauver le manifest côté serveur</QTooltip>
                </QBtn>
              </div>
              <div class="builder-soft-card px-3 py-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <div class="nfz-subtitle">Source active</div>
                  <div class="flex items-center gap-2">
                    <QBadge :color="syncSource === 'server' ? 'primary' : 'secondary'">{{ syncSource }}</QBadge>
                    <QBadge outline color="grey-7">{{ targetServicesDir }}</QBadge>
                  </div>
                </div>
                <div class="mt-1 text-sm nfz-title">{{ syncMessage }}</div>
                <div class="mt-2 text-xs nfz-subtitle">servicesDirs: {{ builderMeta.servicesDirs.join(', ') }}</div>
              </div>
            </div>
          </QExpansionItem>

          <QExpansionItem
            v-model="sidebarHelpOpen"
            dense
            dense-toggle
            expand-separator
            icon="tips_and_updates"
            label="Tests simples & aide"
            header-class="builder-soft-card px-3 py-2 text-sm text-[var(--nfz-text)]"
            class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]"
          >
            <div class="px-3 pb-3 pt-1">
              <div class="space-y-2 text-xs nfz-subtitle">
                <div><strong class="nfz-title">Démo builder</strong> : presets/starters injectés pour tester vite sans confondre avec le scan réel.</div>
                <div><strong class="nfz-title">Services scannés</strong> : fichiers réellement trouvés dans le workspace serveur.</div>
                <div><strong class="nfz-title">Brouillons libres</strong> : services locaux créés manuellement depuis le builder.</div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <QBtn dense no-caps unelevated color="primary" icon="science" label="Démo users" @click="createDemoServiceFromStarter('users')" />
                <QBtn dense no-caps flat color="secondary" icon="article" label="Démo articles" @click="createDemoServiceFromStarter('articles')" />
                <QBtn dense no-caps flat color="accent" icon="dataset" label="Mongo CRUD" @click="createDemoServiceFromPreset('mongoCrud')" />
              </div>
            </div>
          </QExpansionItem>

          <div class="builder-action-grid mt-auto">
            <QBtn flat no-caps dense color="primary" icon="content_copy" label="Dupliquer" class="builder-action-btn" @click="duplicateService(activeId)" />
            <QBtn flat no-caps dense color="negative" icon="delete" label="Suppr." class="builder-action-btn" @click="requestDeleteActive" />
            <QBtn flat no-caps dense color="secondary" icon="download" label="Exporter" class="builder-action-btn" @click="exportManifest" />
            <QBtn flat no-caps dense color="grey-7" icon="restart_alt" label="Reset" class="builder-action-btn" @click="requestResetBuilder" />
          </div>

          <QInnerLoading :showing="loadBusy || saveBusy">
            <QSpinnerBars size="42px" color="primary" />
          </QInnerLoading>
        </section>
      </template>

      <template #after>
        <section class="builder-main grid gap-4">
          <QCard flat bordered class="builder-card overflow-hidden">
            <QCardSection class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="builder-kicker">Navigation globale</div>
                <h2 class="mt-1 builder-heading">Workflow / Presets / Workspace</h2>
                <div class="builder-copy">Workflow pour le paramétrage, Presets pour les scénarios rapides, Workspace pour builder / preview / tests.</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <QBadge color="primary">{{ experienceModeLabel }}</QBadge>
                <QBadge outline color="grey-7">{{ originFilterLabel }}</QBadge>
              </div>
            </QCardSection>
            <QCardSection class="pt-0">
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] px-4 py-3">
                <div>
                  <div class="builder-panel-title">Mode actif : {{ experienceModeLabel }}</div>
                  <div class="text-sm nfz-subtitle">{{ mainPanelSummary }}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <QBtnToggle
                    :model-value="experienceMode"
                    dense
                    unelevated
                    no-caps
                    toggle-color="primary"
                    :options="[
                      { label: 'Tests rapides', value: 'quickTests' },
                      { label: 'Services réels', value: 'realServices' },
                      { label: 'Builder avancé', value: 'advanced' },
                    ]"
                    @update:model-value="(value) => value && openGuidedEntry(value as 'quickTests' | 'realServices' | 'advanced')"
                  />
                  <QBtn v-if="!scenarioCardsVisible" flat dense no-caps color="secondary" icon="widgets" label="Changer de scénario" @click="mainPanelTab = 'workflow'" />
                </div>
              </div>
            </QCardSection>
            <QTabs v-model="mainPanelTab" dense align="left" inline-label class="builder-tabbar px-4 pt-2 bg-[var(--nfz-primary-soft)]/45">
              <QTab name="workflow" icon="account_tree" label="Workflow" />
              <QTab name="presets" icon="auto_awesome" label="Presets" />
              <QTab name="workspace" icon="dashboard_customize" label="Workspace" />
            </QTabs>
            <QSeparator />
            <QTabPanels v-model="mainPanelTab" animated keep-alive>
              <QTabPanel name="workflow" class="p-4 grid gap-4">
                <QCard flat bordered class="builder-soft-card">
                  <QCardSection class="grid gap-3">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div class="builder-panel-title">Choisir un scénario</div>
                        <div class="text-sm nfz-subtitle">Sélectionne un mode, puis continue avec un seul parcours clair.</div>
                      </div>
                      <QBtnToggle
                        :model-value="experienceMode"
                        dense
                        unelevated
                        no-caps
                        toggle-color="primary"
                        :options="[
                          { label: 'Tests rapides', value: 'quickTests' },
                          { label: 'Services réels', value: 'realServices' },
                          { label: 'Builder avancé', value: 'advanced' },
                        ]"
                        @update:model-value="(value) => value && openGuidedEntry(value as 'quickTests' | 'realServices' | 'advanced')"
                      />
                    </div>
                    <div class="grid gap-2 md:grid-cols-3">
                      <QBtn flat no-caps align="left" class="justify-start rounded-14 border border-[var(--nfz-border)] bg-white px-3 py-2" :color="experienceMode === 'quickTests' ? 'secondary' : 'grey-8'" icon="science" label="Tests rapides" @click="openGuidedEntry('quickTests')" />
                      <QBtn flat no-caps align="left" class="justify-start rounded-14 border border-[var(--nfz-border)] bg-white px-3 py-2" :color="experienceMode === 'realServices' ? 'primary' : 'grey-8'" icon="travel_explore" label="Services réels" @click="openGuidedEntry('realServices')" />
                      <QBtn flat no-caps align="left" class="justify-start rounded-14 border border-[var(--nfz-border)] bg-white px-3 py-2" :color="experienceMode === 'advanced' ? 'accent' : 'grey-8'" icon="construction" label="Builder avancé" @click="openGuidedEntry('advanced')" />
                    </div>
                    <div class="rounded-4 border border-[var(--nfz-border)] bg-white px-4 py-4">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="flex items-start gap-3 min-w-0">
                          <QIcon :name="activeScenarioMeta.icon" size="24px" :color="activeScenarioMeta.color" class="q-mt-xs" />
                          <div class="min-w-0">
                            <div class="builder-panel-title">{{ activeScenarioMeta.title }}</div>
                            <div class="text-sm nfz-subtitle">{{ activeScenarioMeta.copy }}</div>
                          </div>
                        </div>
                        <QBtn :color="activeScenarioMeta.color" unelevated no-caps :icon="activeScenarioMeta.icon" :label="activeScenarioMeta.actionLabel" @click="openGuidedEntry(experienceMode)" />
                      </div>
                      <div class="mt-3 flex flex-wrap gap-2 text-xs">
                        <QBadge v-for="tag in activeScenarioMeta.tags" :key="tag" outline :color="activeScenarioMeta.color">{{ tag }}</QBadge>
                      </div>
                    </div>
                  </QCardSection>
                </QCard>
                <QCard flat bordered class="builder-card">
                  <QCardSection class="flex flex-wrap items-start justify-between gap-3 pb-2">
                    <div class="min-w-0">
                      <div class="builder-kicker">Workflow</div>
                      <h2 class="mt-1 builder-heading">Parcours builder</h2>
                      <div class="builder-copy">{{ workflowCaption }}</div>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <QBadge outline color="grey-7">{{ targetServicesDir }}</QBadge>
                      <QBadge :color="previewOrigin.startsWith('generated') ? 'primary' : 'secondary'">{{ previewOrigin }}</QBadge>
                    </div>
                  </QCardSection>
                  <QCardSection class="pt-0 pb-3">
                    <div class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-muted)]/70 px-3 py-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <template v-for="(step, index) in workflowNodes" :key="step.name">
                          <div
                            class="flex min-w-0 items-center gap-2 rounded-3 border px-2.5 py-2 text-xs"
                            :class="workflowStep > step.name
                              ? 'border-positive/30 bg-positive/8 text-positive-8'
                              : workflowStep === step.name
                                ? 'border-primary/30 bg-primary/8 text-primary'
                                : 'border-[var(--nfz-border)] bg-white text-[var(--nfz-text-muted)]'"
                          >
                            <QIcon :name="step.icon" size="16px" />
                            <div class="min-w-0 leading-tight">
                              <div class="font-700">{{ step.title }}</div>
                              <div class="hidden text-[10px] opacity-75 md:block">{{ step.caption }}</div>
                            </div>
                          </div>
                          <QIcon v-if="index < workflowNodes.length - 1" name="chevron_right" size="16px" class="opacity-50" />
                        </template>
                      </div>
                      <div class="mt-3 flex flex-wrap gap-1.5">
                        <QBadge outline color="positive">{{ generationProfileLabel }}</QBadge>
                        <QBadge outline color="accent">{{ hookPresetLabel }}</QBadge>
                        <QBadge outline color="secondary">{{ workspaceTabLabel }}</QBadge>
                      </div>
                    </div>
                  </QCardSection>
                </QCard>

                <QCard flat bordered class="builder-card">
                  <QCardSection class="grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
              <div class="grid gap-4 md:grid-cols-2">
                <QInput v-model="activeService.name" dense outlined label="Nom du service / dossier" @blur="syncNameToPath(activeService)" />
                <QInput v-model="activeService.path" dense outlined label="Path Feathers" @update:model-value="touch()" />
                <QInput v-model="activeService.collection" dense outlined label="Collection" @update:model-value="touch()" />
                <QSelect v-model="activeService.adapter" :options="adapters" dense outlined label="Adapter" @update:model-value="touch()" />
                <QSelect v-model="activeService.schemaMode" :options="schemaModes" emit-value map-options dense outlined label="Mode de schéma" @update:model-value="touch()" />
                <div class="grid gap-2">
                  <QInput v-model="activeService.idField" dense outlined label="idField" @update:model-value="touch()" />
                  <div class="flex items-center gap-2 flex-wrap">
                    <QBadge outline color="grey-7">{{ idFieldHint }}</QBadge>
                    <QBtn flat dense color="primary" label="_id" @click="applyIdFieldPreset('_id')" />
                    <QBtn flat dense color="secondary" label="id" @click="applyIdFieldPreset('id')" />
                  </div>
                </div>
                <QSelect v-model="activeService.hookPreset" :options="hookPresetOptions" emit-value map-options dense outlined label="Profil hooks" @update:model-value="touch()" />
                <QSelect v-model="activeService.hooksFileMode" :options="hooksFileModeOptions" emit-value map-options dense outlined label="Fichier hooks" @update:model-value="touch()" />
                <QSelect v-model="activeService.barrelMode" :options="barrelModeOptions" emit-value map-options dense outlined label="Barrels / index.ts" @update:model-value="touch()" />
                <div class="md:col-span-2">
                  <QInput
                    :model-value="methodsInput"
                    outlined
                    label="Méthodes exposées"
                    hint="Séparées par des virgules. Les chips ci-dessous activent/désactivent rapidement les méthodes natives."
                    @update:model-value="setMethodsFromInput(String($event ?? ''))"
                  />
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <QChip
                      v-for="method in NATIVE_METHODS"
                      :key="method"
                      clickable
                      :outline="!activeService.methods.includes(method)"
                      :color="activeService.methods.includes(method) ? 'primary' : 'grey-7'"
                      @click="toggleMethod(method)"
                    >
                      {{ method }}
                    </QChip>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <QBtn flat dense color="secondary" icon="tune" label="Preset CRUD" @click="setCrudPreset" />
                    <QBtn flat dense color="secondary" icon="add_task" label="Create only" @click="setCreateOnlyPreset" />
                    <QBtn flat dense color="grey-7" icon="code" label="Custom" @click="setCustomOnlyPreset" />
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <QBtn flat dense color="primary" icon="dataset" label="Mongo CRUD" @click="applyServicePreset('mongoCrud')" />
                    <QBtn flat dense color="primary" icon="lock" label="Mongo auth" @click="applyServicePreset('mongoSecureCrud')" />
                    <QBtn flat dense color="secondary" icon="memory" label="Memory CRUD" @click="applyServicePreset('memoryCrud')" />
                    <QBtn flat dense color="accent" icon="bolt" label="Action custom" @click="applyServicePreset('action')" />
                    <QBtn flat dense color="positive" icon="auto_fix_high" label="Aligner au profil détecté" @click="alignToDetectedProfile" />
                  </div>
                </div>
                <div class="md:col-span-2">
                  <QBanner rounded class="bg-[var(--nfz-primary-soft)] text-sm">
                    <div class="font-medium">Presets déplacés dans un onglet dédié</div>
                    <div class="mt-1">Les presets officiels et les starters métier sont maintenant regroupés dans l’onglet <strong>Presets</strong> pour rester visibles sans être masqués par le formulaire.</div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <QBtn color="accent" unelevated no-caps icon="auto_awesome" label="Ouvrir Presets" @click="openPresetsTab" />
                      <QBtn flat dense color="primary" icon="dataset" label="Mongo CRUD" @click="applyServicePreset('mongoCrud')" />
                      <QBtn flat dense color="primary" icon="lock" label="Mongo auth" @click="applyServicePreset('mongoSecureCrud')" />
                      <QBtn flat dense color="secondary" icon="memory" label="Memory CRUD" @click="applyServicePreset('memoryCrud')" />
                      <QBtn flat dense color="accent" icon="bolt" label="Action" @click="applyServicePreset('action')" />
                    </div>
                  </QBanner>
                </div>
                <QInput :model-value="targetServiceDir" outlined readonly label="Dossier cible apply" />
                <div class="flex items-center gap-4 md:col-span-2">
                  <QToggle v-model="activeService.auth" label="Auth hook" color="primary" @update:model-value="touch()" />
                  <QToggle v-model="activeService.docs" label="Docs / swagger" color="primary" @update:model-value="touch()" />
                </div>
              </div>

              <div class="grid gap-3 content-start ">
                <div class="builder-side-panel text-sm">
                  <div class="builder-panel-title mb-2">Résumé builder</div>
                  <div class="builder-meta-grid">
                    <div class="builder-meta-row"><span class="nfz-subtitle">Service</span><span class="font-medium text-right break-all">{{ activeService.name }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">FS name</span><span class="font-medium text-right">{{ activeServiceFsName }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Path</span><span class="font-medium text-right break-all">{{ activeService.path }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Prévisualisation</span><span class="font-medium text-right">{{ previewUsesSource ? 'source réel' : 'génération NFZ' }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Pattern</span><span class="font-medium text-right">{{ collectionLikeLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Profil détecté</span><span class="font-medium text-right">{{ generationProfileLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Profil hooks</span><span class="font-medium text-right">{{ hookPresetLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Fichier hooks</span><span class="font-medium text-right">{{ hooksFileModeLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Barrels</span><span class="font-medium text-right">{{ barrelModeLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Plan hooks</span><span class="font-medium text-right">{{ hookPlanSummary }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Root barrel</span><span class="font-medium text-right">{{ rootBarrelSummary }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Preset actif</span><span class="font-medium text-right">{{ activePresetDefinition?.label || 'custom' }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Preset fields</span><span class="font-medium text-right">{{ presetFieldNames.length || activeService.fields.length }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Starter métier</span><span class="font-medium text-right">{{ activeStarterDefinition?.id || 'none' }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Source</span><span class="font-medium">{{ getServiceOriginLabel(activeService) }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Fichiers source</span><span class="font-medium">{{ activeSourceFiles.length }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Méthodes</span><span class="font-medium">{{ activeService.methods.length }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Classe générée</span><span class="font-medium text-right break-all">{{ generatedClassName }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Fonction register</span><span class="font-medium text-right break-all">{{ generatedRegisterName }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Shared base</span><span class="font-medium text-right break-all">{{ generatedSharedBase }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Schema base</span><span class="font-medium text-right break-all">{{ generatedSchemaBase }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Maj</span><span class="font-medium text-right">{{ new Date(activeService.updatedAt).toLocaleString() }}</span></div>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <QBadge v-for="kind in activeSourceKinds" :key="kind" outline color="secondary">{{ kind }}</QBadge>
                    <QBadge outline color="primary">{{ generatedClassName }}</QBadge>
                    <QBadge outline color="accent">{{ generatedRegisterName }}</QBadge>
                    <QBadge outline color="secondary">{{ hookPresetLabel }}</QBadge>
                    <QBadge :color="getServiceOriginKind(activeService) === 'scanned' ? 'positive' : (getServiceOriginKind(activeService) === 'demo' ? 'warning' : 'grey-7')" outline>{{ getServiceOriginLabel(activeService) }}</QBadge>
                    <QBadge outline color="positive">{{ generationProfileLabel }}</QBadge>
                    <QBadge outline color="grey-7">{{ lastAction }}</QBadge>
                  </div>
                  <QBanner rounded class="mt-4 bg-[var(--nfz-success-soft)] text-sm">
                    <div class="font-medium">Profil de génération détecté</div>
                    <div class="mt-1">{{ generationProfileHint }}</div>
                    <div class="mt-2">Profil interne : <code>{{ generationProfile }}</code></div>
                  </QBanner>
                  <QBanner v-if="activeService.path !== activeServiceFsName" rounded class="mt-4 bg-[var(--nfz-primary-soft)] text-sm">
                    <div class="font-medium">NFZ distingue le dossier du service et le path Feathers.</div>
                    <div class="mt-1">Dossier/fichiers : <code>{{ activeServiceFsName }}</code> · endpoint : <code>{{ activeService.path }}</code></div>
                  </QBanner>
                  <QBanner v-if="builderWarnings.length" rounded class="mt-4 bg-[var(--nfz-warning-soft)] text-sm">
                    <div class="font-medium">Points de vigilance builder</div>
                    <ul class="mt-2 list-disc pl-5 space-y-1">
                      <li v-for="warning in builderWarnings" :key="warning">{{ warning }}</li>
                    </ul>
                  </QBanner>
                  <QInput v-model="activeService.notes" type="textarea" autogrow outlined class="mt-4" label="Notes" @update:model-value="touch()" />
                </div>
              </div>
            </QCardSection>
          </QCard>
              </QTabPanel>

              <QTabPanel name="presets" class="p-4">
                <QCard flat bordered class="builder-card">
                  <QCardSection class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div class="builder-kicker">Presets</div>
                      <h2 class="mt-1 builder-heading">Presets officiels et starters métier</h2>
                      <div class="builder-copy">Zone dédiée pour lancer rapidement un scénario de démonstration sans scroll long dans le formulaire.</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <QBadge color="accent">{{ presetCatalog.length }} presets</QBadge>
                      <QBadge color="secondary">{{ starterCatalog.length }} starters</QBadge>
                      <QBadge outline color="grey-7">Service actif : {{ activeService.name }}</QBadge>
                    </div>
                  </QCardSection>
                  <QSeparator />
                  <QCardSection class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr),minmax(320px,0.7fr)] max-h-[56vh] overflow-auto">
                    <div class="grid gap-4">
                      <QBanner rounded class="bg-[var(--nfz-primary-soft)] text-sm">
                        <div class="font-medium">Accès rapide</div>
                        <div class="mt-1">Choisis un preset pour préremplir le builder, puis passe sur <strong>Workspace</strong> pour le preview, le diff et l’apply.</div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <QBtn color="primary" unelevated no-caps icon="dashboard_customize" label="Aller au Workspace" @click="mainPanelTab = 'workspace'" />
                          <QBtn flat dense color="secondary" icon="account_tree" label="Retour Workflow" @click="mainPanelTab = 'workflow'" />
                        </div>
                      </QBanner>
                      <div>
                        <div class="mb-2 text-sm font-semibold nfz-title">Presets builder officiels</div>
                        <div class="grid gap-3 xl:grid-cols-2">
                          <button
                            v-for="preset in presetCatalog"
                            :key="preset.id"
                            type="button"
                            class="rounded-4 border border-[var(--nfz-border)] bg-white/40 dark:bg-black/10 px-4 py-3 text-left transition-colors hover:bg-[var(--nfz-primary-soft)]"
                            @click="applyServicePreset(preset.id)"
                          >
                            <div class="flex items-center justify-between gap-3">
                              <div class="flex items-center gap-2">
                                <QIcon :name="preset.icon" :color="preset.tone" size="18px" />
                                <span class="font-semibold nfz-title">{{ preset.label }}</span>
                              </div>
                              <QBadge :color="preset.tone" outline>{{ preset.id }}</QBadge>
                            </div>
                            <div class="mt-2 text-sm nfz-subtitle">{{ preset.copy }}</div>
                            <div class="mt-2 text-xs nfz-subtitle">{{ preset.hint }}</div>
                            <div class="mt-2 flex flex-wrap gap-1.5">
                              <QBadge v-for="bullet in preset.bullets" :key="bullet" outline color="grey-7">{{ bullet }}</QBadge>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="grid gap-4 content-start">
                      <div class="builder-side-panel">
                        <div class="builder-panel-title mb-2">Starters métier</div>
                        <div class="text-sm nfz-subtitle">Pour des tests simples et immédiatement compréhensibles.</div>
                        <div class="mt-3 grid gap-2">
                          <button
                            v-for="starter in starterCatalog"
                            :key="starter.id"
                            type="button"
                            class="rounded-4 border border-[var(--nfz-border)] bg-white/40 dark:bg-black/10 px-4 py-3 text-left transition-colors hover:bg-[var(--nfz-primary-soft)]"
                            @click="applyServiceStarter(starter.id)"
                          >
                            <div class="flex items-center justify-between gap-3">
                              <div class="flex items-center gap-2">
                                <QIcon :name="starter.icon" :color="starter.tone" size="18px" />
                                <span class="font-semibold nfz-title">{{ starter.label }}</span>
                              </div>
                              <QBadge :color="starter.tone" outline>{{ starter.id }}</QBadge>
                            </div>
                            <div class="mt-2 text-sm nfz-subtitle">{{ starter.copy }}</div>
                            <div class="mt-2 flex flex-wrap gap-1.5">
                              <QBadge outline color="grey-7">preset {{ starter.presetId }}</QBadge>
                              <QBadge v-for="field in starter.service.fields || []" :key="field.id" outline color="grey-7">{{ field.name }}</QBadge>
                            </div>
                          </button>
                        </div>
                      </div>
                      <div class="builder-side-panel">
                        <div class="builder-panel-title mb-2">Lecture rapide</div>
                        <div class="grid gap-2 text-sm">
                          <div class="builder-meta-row"><span class="nfz-subtitle">Preset actif</span><strong>{{ activePresetDefinition?.label || 'custom' }}</strong></div>
                          <div class="builder-meta-row"><span class="nfz-subtitle">Starter métier</span><strong>{{ activeStarterDefinition?.label || 'aucun' }}</strong></div>
                          <div class="builder-meta-row"><span class="nfz-subtitle">Service courant</span><strong>{{ activeService.name }}</strong></div>
                          <div class="builder-meta-row"><span class="nfz-subtitle">Origine</span><strong>{{ getServiceOriginLabel(activeService) }}</strong></div>
                        </div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <QBtn flat dense color="primary" icon="dataset" label="Démo Mongo CRUD" @click="applyServicePreset('mongoCrud')" />
                          <QBtn flat dense color="accent" icon="bolt" label="Démo Action" @click="applyServicePreset('action')" />
                          <QBtn flat dense color="secondary" icon="person" label="Starter users" @click="applyServiceStarter('users')" />
                        </div>
                      </div>
                    </div>
                  </QCardSection>
                </QCard>
              </QTabPanel>

              <QTabPanel name="workspace" class="p-4">
                <QCard flat bordered class="builder-card">
                  <QCardSection class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="builder-kicker">Workspace</div>
                <h2 class="mt-1 builder-heading">{{ workspaceTitle }}</h2>
                <div class="builder-copy">{{ workspaceCopy }}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <QBadge v-for="tab in workspaceTabOptions" :key="tab.name" :color="workspaceTab === tab.name ? tab.tone : 'grey-7'">{{ tab.label }}</QBadge>
              </div>
            </QCardSection>
            <QTabs v-model="workspaceTab" dense align="left" inline-label class="builder-tabbar">
              <QTab v-for="tab in workspaceTabOptions" :key="tab.name" :name="tab.name" :icon="tab.icon" :label="tab.label" />
            </QTabs>
            <QSeparator />
            <QTabPanels v-model="workspaceTab" animated keep-alive>
              <QTabPanel v-if="workspaceTabNames.includes('builder')" name="builder" class="p-4">
                <BuilderSummaryPanel
                  kicker="Schema builder"
                  title="Champs"
                  copy="Édition rapide des champs avec aperçu immédiat du schéma généré."
                >
                  <template #fields>
                    <QCard flat bordered class="builder-card">
                      <QCardSection class="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div class="builder-kicker">Schema builder</div>
                          <h2 class="mt-1 builder-heading">Champs</h2>
                          <div class="builder-copy">Édition rapide des champs avec aperçu immédiat du schéma généré.</div>
                        </div>
                        <QBtn color="primary" unelevated no-caps dense icon="add" label="Ajouter" @click="addField" />
                      </QCardSection>
                      <QSeparator />
                      <QCardSection class="grid gap-3 max-h-[56vh] overflow-auto">
                        <div
                          v-for="field in activeService.fields"
                          :key="field.id"
                          class="builder-field-row"
                        >
                          <QInput v-model="field.name" outlined dense label="Nom" @update:model-value="touch()" />
                          <QSelect v-model="field.type" :options="fieldTypeOptions" outlined dense label="Type" @update:model-value="touch()" />
                          <QToggle v-model="field.required" dense label="Required" color="primary" @update:model-value="touch()" />
                          <QToggle v-model="field.nullable" dense label="Nullable" color="primary" @update:model-value="touch()" />
                          <QInput v-model="field.description" outlined dense label="Description" @update:model-value="touch()" />
                          <QBtn flat color="negative" icon="delete" round @click="removeField(field.id)" />
                        </div>
                      </QCardSection>
                    </QCard>
                  </template>
                  <template #summary>
                    <div class="builder-side-panel text-sm">
                      <div class="builder-panel-title mb-2">Résumé builder</div>
                      <div class="builder-meta-grid">
                        <div class="builder-meta-row"><span class="nfz-subtitle">Service</span><span class="font-medium text-right break-all">{{ activeService.name }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">FS name</span><span class="font-medium text-right">{{ activeServiceFsName }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Path</span><span class="font-medium text-right break-all">{{ activeService.path }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Prévisualisation</span><span class="font-medium text-right">{{ previewUsesSource ? 'source réel' : 'génération NFZ' }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Pattern</span><span class="font-medium text-right">{{ collectionLikeLabel }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Profil détecté</span><span class="font-medium text-right">{{ generationProfileLabel }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Profil hooks</span><span class="font-medium text-right">{{ hookPresetLabel }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Fichier hooks</span><span class="font-medium text-right">{{ hooksFileModeLabel }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Plan hooks</span><span class="font-medium text-right">{{ hookPlanSummary }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Root barrel</span><span class="font-medium text-right">{{ rootBarrelSummary }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Preset actif</span><span class="font-medium text-right">{{ activePresetDefinition?.label || 'custom' }}</span></div>
                    <div class="builder-meta-row"><span class="nfz-subtitle">Preset fields</span><span class="font-medium text-right">{{ presetFieldNames.length || activeService.fields.length }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Source</span><span class="font-medium">{{ getServiceOriginLabel(activeService) }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Fichiers source</span><span class="font-medium">{{ activeSourceFiles.length }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Méthodes</span><span class="font-medium">{{ activeService.methods.length }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Classe générée</span><span class="font-medium text-right break-all">{{ generatedClassName }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Fonction register</span><span class="font-medium text-right break-all">{{ generatedRegisterName }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Shared base</span><span class="font-medium text-right break-all">{{ generatedSharedBase }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Schema base</span><span class="font-medium text-right break-all">{{ generatedSchemaBase }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Maj</span><span class="font-medium text-right">{{ new Date(activeService.updatedAt).toLocaleString() }}</span></div>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <QBadge v-for="kind in activeSourceKinds" :key="kind" outline color="secondary">{{ kind }}</QBadge>
                        <QBadge outline color="primary">{{ generatedClassName }}</QBadge>
                        <QBadge outline color="accent">{{ generatedRegisterName }}</QBadge>
                        <QBadge outline color="secondary">{{ hookPresetLabel }}</QBadge>
                        <QBadge outline color="grey-7">{{ hooksFileModeLabel }}</QBadge>
                        <QBadge outline color="grey-7">{{ barrelModeLabel }}</QBadge>
                        <QBadge outline color="grey-7">{{ rootBarrelServicePaths.length }} root export(s)</QBadge>
                        <QBadge outline color="positive">{{ generationProfileLabel }}</QBadge>
                        <QBadge outline color="grey-7">{{ lastAction }}</QBadge>
                      </div>
                      <QBanner rounded class="mt-4 bg-[var(--nfz-success-soft)] text-sm">
                        <div class="font-medium">Profil de génération détecté</div>
                        <div class="mt-1">{{ generationProfileHint }}</div>
                        <div class="mt-2">Profil interne : <code>{{ generationProfile }}</code></div>
                      </QBanner>
                      <QBanner v-if="activeService.path !== activeServiceFsName" rounded class="mt-4 bg-[var(--nfz-primary-soft)] text-sm">
                        <div class="font-medium">NFZ distingue le dossier du service et le path Feathers.</div>
                        <div class="mt-1">Dossier/fichiers : <code>{{ activeServiceFsName }}</code> · endpoint : <code>{{ activeService.path }}</code></div>
                      </QBanner>
                      <QBanner v-if="builderWarnings.length" rounded class="mt-4 bg-[var(--nfz-warning-soft)] text-sm">
                        <div class="font-medium">Points de vigilance builder</div>
                        <ul class="mt-2 list-disc pl-5 space-y-1">
                          <li v-for="warning in builderWarnings" :key="warning">{{ warning }}</li>
                        </ul>
                      </QBanner>
                      <QInput v-model="activeService.notes" type="textarea" autogrow outlined class="mt-4" label="Notes" @update:model-value="touch()" />
                    </div>
                  </template>
                </BuilderSummaryPanel>
              </QTabPanel>
              <QTabPanel v-if="workspaceTabNames.includes('preview')" name="preview" class="p-4">
                <PreviewGeneratorPanel
                  :copy="`Prévisualisation fidèle, comparaison source ↔ généré et écriture directe dans ${targetServicesDir}.`"
                  :subtitle="`Profil hooks actif : ${hookPresetLabel} · ${hookPlanSummary}`"
                  :loading="dryRunBusy || applyBusy"
                >
                  <template #header-actions>
                    <QBtnToggle
                      v-model="previewMode"
                      unelevated
                      dense
                      toggle-color="primary"
                      :options="[
                        { label: 'Généré', value: 'generated' },
                        { label: 'Source', value: 'source', disable: !activeSourceFiles.length }
                      ]"
                    />
                    <QBtn flat color="grey-7" icon="content_copy" label="Copier" @click="copyToClipboard(currentPreviewContent, `${currentPreviewLabel} copié`)" />
                    <QBtn flat color="secondary" icon="visibility" label="Dry-run" :loading="dryRunBusy" @click="dryRun" />
                    <QBtn color="primary" unelevated icon="play_arrow" label="Apply" :loading="applyBusy" @click="requestApplyActive" />
                  </template>
                  <template #tabs>
                    <QTabs v-model="previewTab" dense inline-label class="builder-tabbar">
                      <QTab name="manifest" icon="data_object" label="Manifest" />
                      <QTab name="shared" icon="route" label="Shared" />
                      <QTab name="class" icon="inventory_2" label="Class" />
                      <QTab name="schema" icon="rule" label="Schéma" />
                      <QTab name="service" icon="build" label="Service" />
                      <QTab name="hooks" icon="alt_route" label="Hooks" />
                      <QTab name="barrel" icon="account_tree" label="Barrel" />
                      <QTab name="rootBarrel" icon="route" :label="`Services index (${rootBarrelServicePaths.length})`" />
                      <QTab name="custom" icon="code" label="Code custom" />
                      <QTab name="files" icon="folder_zip" label="Fichiers" />
                      <QTab name="diff" icon="compare_arrows" label="Diff" />
                    </QTabs>
                  </template>
                    <QBanner rounded dense class="mt-3 bg-[var(--nfz-primary-soft)] text-sm">
                      <div class="font-medium">Agrégation root barrel</div>
                      <div class="mt-1">{{ rootBarrelSummary }}</div>
                      <div v-if="rootBarrelServicePaths.length" class="mt-2 flex flex-wrap gap-1.5">
                        <QBadge v-for="servicePath in rootBarrelServicePaths" :key="servicePath" outline color="primary">{{ servicePath }}</QBadge>
                      </div>
                    </QBanner>
                  <template #main>
                    <div class="builder-side-panel">
                      <div class="builder-panel-title flex items-center justify-between gap-2">
                        <span>Aperçu courant</span>
                        <QBadge outline color="primary">{{ currentPreviewLabel }}</QBadge>
                      </div>
                      <div class="mt-2 text-sm nfz-subtitle flex items-center justify-between gap-2 flex-wrap">
                        <div class="font-medium break-all">{{ currentPreviewLabel }}</div>
                        <div class="flex items-center gap-2 text-xs">
                          <QBadge v-if="previewUsesSource" color="secondary" outline>source</QBadge>
                          <QBadge color="grey-7" outline>{{ previewModeLabel }}</QBadge>
                        </div>
                      </div>
                    </div>
                    <QTabPanels v-model="previewTab" animated keep-alive class="max-h-[68vh] overflow-y-auto pr-1">
                      <QTabPanel name="manifest" class="p-0">
                        <NfzCodeEditor :model-value="manifestPreview" mode="json" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="shared" class="p-0">
                        <NfzCodeEditor :model-value="sharedPreview" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="class" class="p-0">
                        <NfzCodeEditor :model-value="classPreview" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="schema" class="p-0">
                        <NfzCodeEditor :model-value="schemaPreview" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="service" class="p-0">
                        <NfzCodeEditor :model-value="servicePreview" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="hooks" class="p-0">
                        <NfzCodeEditor :model-value="hooksPreview" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="custom" class="p-0">
                        <NfzCodeEditor :model-value="activeService.customCode" mode="ts" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="files" class="p-0">
                        <NfzCodeEditor :model-value="activeGeneratedFile?.content || ''" :mode="activeGeneratedFile?.language || 'ts'" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                      <QTabPanel name="diff" class="p-0">
                        <NfzCodeEditor :model-value="activeDiffRecord?.diffText || ''" mode="diff" :dark="!!props.dark" :height="'62vh'" :style="{ minHeight: '58vh' }" disabled />
                      </QTabPanel>
                    </QTabPanels>
                  </template>
                  <template #aside>
                    <div class="builder-side-panel">
                      <div class="builder-panel-title">Manifest import / export</div>
                      <div class="mt-2 text-sm nfz-subtitle">Importe un JSON, recharge depuis le serveur ou persiste le workspace local.</div>
                      <QInput v-model="importPayload" type="textarea" autogrow outlined class="mt-3" label="Manifest JSON" />
                      <div class="mt-3 flex flex-wrap gap-2">
                        <QBtn flat color="primary" icon="upload_file" label="Importer" @click="importManifest" />
                        <QBtn flat color="secondary" icon="save" label="Sauver" :loading="saveBusy" @click="saveManifest" />
                        <QBtn flat color="grey-7" icon="download" label="Charger" :loading="loadBusy" @click="loadManifest" />
                      </div>
                      <div class="mt-3 text-xs nfz-subtitle">{{ syncMessage }}</div>
                    </div>
                    <div class="builder-side-panel">
                      <div class="builder-panel-title">{{ previewTab === 'diff' ? 'Diff source ↔ généré' : 'Fichiers du service' }}</div>
                      <div v-if="previewTab === 'diff'" class="mt-3">
                        <div class="grid grid-cols-2 gap-2 text-sm">
                          <div class="rounded-3 border border-[var(--nfz-border)] px-3 py-2"><span class="nfz-subtitle">Ajouts</span><div class="font-semibold">{{ activeDiffRecord?.added || 0 }}</div></div>
                          <div class="rounded-3 border border-[var(--nfz-border)] px-3 py-2"><span class="nfz-subtitle">Suppressions</span><div class="font-semibold">{{ activeDiffRecord?.removed || 0 }}</div></div>
                        </div>
                        <div class="grid gap-2 max-h-[280px] overflow-auto pr-1 mt-3">
                          <button
                            v-for="record in diffRecords"
                            :key="record.key"
                            type="button"
                            class="rounded-3 border px-3 py-2 text-left text-sm"
                            :class="record.key === diffSelectedKey ? 'border-[var(--nfz-primary)] bg-[var(--nfz-primary-soft)]' : 'border-[var(--nfz-border)] bg-white/40 dark:bg-black/10'"
                            @click="diffSelectedKey = record.key"
                          >
                            <div class="flex items-center justify-between gap-2">
                              <span class="truncate">{{ record.label }}</span>
                              <QBadge :color="record.status === 'same' ? 'positive' : record.status === 'modified' ? 'warning' : record.status === 'new' ? 'primary' : 'negative'">{{ record.status }}</QBadge>
                            </div>
                            <div class="mt-1 flex flex-wrap gap-1.5">
                              <QBadge outline color="positive">+{{ record.added }}</QBadge>
                              <QBadge outline color="negative">-{{ record.removed }}</QBadge>
                            </div>
                            <div class="mt-1 text-xs nfz-subtitle break-all">{{ record.sourcePath || '∅ source' }} → {{ record.generatedPath || '∅ generated' }}</div>
                          </button>
                          <div v-if="!diffRecords.length" class="text-sm nfz-subtitle">
                            Aucun diff disponible. Lance un dry-run ou charge des sources scannées.
                          </div>
                        </div>
                      </div>
                      <div v-else class="mt-3 grid gap-2 max-h-[280px] overflow-auto pr-1">
                        <button
                          v-for="file in fileList"
                          :key="file.path"
                          type="button"
                          class="rounded-3 border px-3 py-2 text-left text-sm"
                          :class="file.path === filePreviewPath ? 'border-[var(--nfz-primary)] bg-[var(--nfz-primary-soft)]' : 'border-[var(--nfz-border)] bg-white/40 dark:bg-black/10'"
                          @click="filePreviewPath = file.path"
                        >
                          {{ file.path }}
                        </button>
                        <div v-if="!fileList.length" class="text-sm nfz-subtitle">
                          Aucun fichier à afficher. Passe en mode généré ou lance un dry-run/apply.
                        </div>
                      </div>
                    </div>
                    <div class="builder-side-panel">
                      <div class="builder-panel-title">Apply serveur</div>
                      <div class="mt-2 text-sm nfz-subtitle">
                        L’apply écrit directement dans <code>{{ targetServiceDir }}</code> en se basant sur le premier dossier de <code>feathers.servicesDirs</code>.
                      </div>
                      <div class="mt-3 grid gap-2 text-sm">
                        <div class="builder-meta-row"><span class="nfz-subtitle">Services dir</span><span class="font-medium">{{ targetServicesDir }}</span></div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">FS name</span><span class="font-medium">{{ activeServiceFsName }}</span></div>
                      </div>
                      <div class="mt-3 grid gap-2">
                        <div class="nfz-subtitle text-xs">Commande CLI approchante</div>
                        <div class="rounded-3 border border-[var(--nfz-border)] bg-white/40 dark:bg-black/10 p-2 text-xs break-all">
                          <code>{{ builderCliPreview }}</code>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                          <QBadge v-for="item in applyChecklist" :key="item" outline color="grey-7">{{ item }}</QBadge>
                        </div>
                      </div>
                      <div class="mt-3 grid gap-2">
                        <div class="nfz-subtitle text-xs">Layout NFZ généré</div>
                        <div class="max-h-[180px] overflow-auto pr-1 text-xs space-y-1">
                          <div
                            v-for="row in layoutPreviewRows"
                            :key="row.path"
                            class="rounded-3 border border-[var(--nfz-border)] px-2 py-1"
                          >
                            <div class="flex items-center justify-between gap-2">
                              <span class="font-medium">{{ row.label }}</span>
                              <QBadge outline color="grey-7">{{ row.kind }}</QBadge>
                            </div>
                            <div class="mt-1 break-all nfz-subtitle">{{ row.path }}</div>
                          </div>
                        </div>
                      </div>
                      <div v-if="applyResult?.outputDir" class="mt-3 text-sm grid gap-2">
                        <div>
                          <div class="nfz-subtitle">Output</div>
                          <div class="font-medium break-all">{{ applyResult.outputDir }}</div>
                        </div>
                        <div class="builder-meta-row"><span class="nfz-subtitle">Fichiers écrits</span><span class="font-medium">{{ applyResult.fileCount || applyResult.files?.length || 0 }}</span></div>
                        <div v-if="applyResult.writtenAt" class="builder-meta-row"><span class="nfz-subtitle">Dernier apply</span><span class="font-medium">{{ applyResult.writtenAt }}</span></div>
                        <div v-if="applyResult.files?.length" class="grid gap-1">
                          <div class="nfz-subtitle">Derniers fichiers</div>
                          <div class="max-h-[120px] overflow-auto pr-1 text-xs space-y-1">
                            <div v-for="file in applyResult.files.slice(0, 6)" :key="file.path" class="break-all rounded-3 border border-[var(--nfz-border)] px-2 py-1">
                              {{ file.path }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </PreviewGeneratorPanel>
              </QTabPanel>
              <QTabPanel v-if="workspaceTabNames.includes('tests')" name="tests" class="p-4">
                <MethodTestsPanel :path-label="activeService.path">
                  <template #controls>
                    <QSelect v-model="testMethod" :options="testMethodOptions" emit-value map-options outlined dense label="Méthode" />
                    <QInput v-model="testQuery" type="textarea" autogrow outlined label="Query / params JSON" />
                    <QInput v-model="testPayload" type="textarea" autogrow outlined label="Payload JSON" />
                    <QBanner rounded class="bg-[var(--nfz-primary-soft)] text-sm">
                      <div class="font-medium">Endpoint</div>
                      <div class="mt-1 break-all"><code>{{ testRestPath }}</code></div>
                    </QBanner>
                  </template>
                  <template #preview>
                    <QCard flat bordered class="builder-card overflow-hidden">
                      <QTabs v-model="testsPreviewTab" dense inline-label class="builder-tabbar px-4 pt-3">
                        <QTab name="request" icon="alt_route" label="Requête" />
                        <QTab name="curl" icon="terminal" label="curl" />
                        <QTab name="response" icon="fact_check" label="Réponse" />
                      </QTabs>
                      <QSeparator />
                      <QTabPanels v-model="testsPreviewTab" animated keep-alive>
                        <QTabPanel name="request" class="p-4">
                          <div class="builder-panel-title mb-2">Requête Feathers / NFZ</div>
                          <NfzCodeEditor :model-value="testRequestPreview" mode="json" :dark="!!props.dark" :style="{ minHeight: '48vh' }" disabled />
                        </QTabPanel>
                        <QTabPanel name="curl" class="p-4">
                          <div class="builder-panel-title mb-2">Exemple curl</div>
                          <NfzCodeEditor :model-value="testCurlPreview" mode="bash" :dark="!!props.dark" :style="{ minHeight: '48vh' }" disabled />
                        </QTabPanel>
                        <QTabPanel name="response" class="p-4">
                          <div class="builder-panel-title mb-2">Réponse prévisible</div>
                          <NfzCodeEditor :model-value="testResultPreview" mode="json" :dark="!!props.dark" :style="{ minHeight: '48vh' }" disabled />
                        </QTabPanel>
                      </QTabPanels>
                    </QCard>
                  </template>
                </MethodTestsPanel>
              </QTabPanel>
            </QTabPanels>
          </QCard>
        </QTabPanel>
      </QTabPanels>
    </QCard>
  </section>
      </template>
    </QSplitter>

    <QDialog v-model="deleteConfirmOpen">
      <QCard style="min-width: 420px">
        <QCardSection class="row items-center q-gutter-sm">
          <QIcon name="delete" color="negative" />
          <div class="text-h6">Supprimer ce service ?</div>
        </QCardSection>
        <QCardSection class="text-body2">
          Le manifest de <strong>{{ activeService.name }}</strong> sera retiré du workspace local courant.
        </QCardSection>
        <QCardActions align="right">
          <QBtn flat label="Annuler" v-close-popup />
          <QBtn color="negative" unelevated label="Supprimer" @click="confirmDeleteActive" />
        </QCardActions>
      </QCard>
    </QDialog>

    <QDialog v-model="resetConfirmOpen">
      <QCard style="min-width: 440px">
        <QCardSection class="row items-center q-gutter-sm">
          <QIcon name="restart_alt" color="warning" />
          <div class="text-h6">Réinitialiser le builder ?</div>
        </QCardSection>
        <QCardSection class="text-body2">
          Cette action remet un manifest minimal dans l’espace local. Les fichiers scannés du serveur pourront être rechargés ensuite.
        </QCardSection>
        <QCardActions align="right">
          <QBtn flat label="Annuler" v-close-popup />
          <QBtn color="warning" unelevated label="Réinitialiser" @click="confirmResetBuilder" />
        </QCardActions>
      </QCard>
    </QDialog>

    <QDialog v-model="applyConfirmOpen">
      <QCard style="min-width: 480px">
        <QCardSection class="row items-center q-gutter-sm">
          <QIcon name="publish" color="primary" />
          <div class="text-h6">Confirmer l’apply</div>
        </QCardSection>
        <QCardSection class="text-body2">
          Les fichiers générés pour <strong>{{ activeService.name }}</strong> seront écrits dans <code>{{ targetServiceDir }}</code>.
          <div class="q-mt-sm nfz-subtitle">Étape recommandée : relire l’onglet Diff avant validation.</div>
        </QCardSection>
        <QCardActions align="right">
          <QBtn flat label="Annuler" v-close-popup />
          <QBtn color="primary" unelevated label="Apply" @click="confirmApplyActive" />
        </QCardActions>
      </QCard>
    </QDialog>
  </div>
</template>


