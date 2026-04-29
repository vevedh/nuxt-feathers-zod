<script setup lang="ts">
import type { QTableColumn } from 'quasar'

definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})

const messages = useMessagesStore()
const text = ref('')

const columns: QTableColumn[] = [
  {
    name: 'id',
    label: '#',
    field: row => messages.getEntityId(row) ?? '',
    align: 'left',
    sortable: true,
  },
  {
    name: 'text',
    label: 'Message',
    field: 'text',
    align: 'left',
    sortable: true,
  },
  {
    name: 'userId',
    label: 'Auteur',
    field: row => row.userId ?? 'system',
    align: 'left',
    sortable: true,
  },
  {
    name: 'createdAt',
    label: 'Créé le',
    field: 'createdAt',
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: '',
    field: row => messages.getEntityId(row) ?? '',
    align: 'right',
  },
]

async function submit(): Promise<void> {
  await messages.createMessage(text.value)

  if (!messages.error)
    text.value = ''
}

onMounted(async () => {
  await messages.fetchMessages()
})
</script>

<template>
  <div class="grid gap-6">
    <section class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-800">
          Messages
        </h1>
        <p class="mt-1 nfz-muted">
          Exemple de service Feathers protégé par JWT, consommé via store Pinia.
        </p>
      </div>
      <QBtn
        :ripple="false"
        color="primary"
        icon="refresh"
        label="Rafraîchir"
        :loading="messages.loading"
        @click="messages.fetchMessages"
      />
    </section>

    <QBanner
      v-if="messages.error"
      rounded
      class="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      <template #avatar>
        <QIcon name="error" />
      </template>
      <pre class="m-0 whitespace-pre-wrap font-sans text-sm">{{ messages.error }}</pre>
    </QBanner>

    <QCard class="nfz-card">
      <QCardSection>
        <QForm class="grid gap-4 md:grid-cols-[1fr_auto]" @submit.prevent="submit">
          <QInput
            v-model="text"
            outlined
            label="Nouveau message"
            placeholder="Écrire un message de test..."
            :disable="messages.saving"
          />
          <QBtn
            :ripple="false"
            unelevated
            color="primary"
            type="submit"
            icon="send"
            label="Envoyer"
            :loading="messages.saving"
            :disable="!text.trim()"
          />
        </QForm>
      </QCardSection>
    </QCard>

    <QCard class="nfz-card">
      <QTable
        flat
        title="Messages enregistrés"
        row-key="id"
        :rows="messages.items"
        :columns="columns"
        :loading="messages.loading"
      >
        <template #body-cell-actions="props">
          <QTd :props="props">
            <QBtn
              :ripple="false"
              flat
              dense
              round
              color="negative"
              icon="delete"
              :disable="messages.getEntityId(props.row) == null"
              @click="messages.removeMessage(messages.getEntityId(props.row)!)"
            />
          </QTd>
        </template>
      </QTable>
    </QCard>
  </div>
</template>
