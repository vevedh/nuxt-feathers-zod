<script setup lang="ts">
definePageMeta({
  middleware: ['auth-keycloak-ldap'],
})

const current = useCurrentLdapUser()

const ldapEntries = computed(() => {
  const ldap = current.ldap.value

  if (!ldap) {
    return []
  }

  return Object.entries(ldap).map(([key, value]) => ({
    key,
    value: Array.isArray(value)
      ? value.join('\n')
      : typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value ?? ''),
  }))
})
</script>

<template>
  <QPage padding>
    <ClientOnly>
      <div class="mx-auto max-w-6xl">
        <QBanner
          v-if="!current.user.value"
          class="bg-orange-1 text-orange-10 q-mb-md"
          rounded
        >
          Synchronisation LDAP en cours ou utilisateur LDAP indisponible.
        </QBanner>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <QCard flat bordered>
              <QCardSection class="text-center">
                <QAvatar size="96px" color="primary" text-color="white">
                  {{ current.initials.value }}
                </QAvatar>

                <div class="text-h6 q-mt-md">
                  {{ current.displayName.value }}
                </div>

                <div class="text-grey-7">
                  {{ current.user.value?.email }}
                </div>

                <div class="q-mt-md row justify-center q-gutter-xs">
                  <QBadge
                    v-for="role in current.roles.value"
                    :key="role"
                    color="primary"
                    outline
                  >
                    {{ role }}
                  </QBadge>
                </div>
              </QCardSection>

              <QSeparator />

              <QList>
                <QItem>
                  <QItemSection avatar>
                    <QIcon name="badge" />
                  </QItemSection>
                  <QItemSection>
                    <QItemLabel>{{ current.user.value?.username || '-' }}</QItemLabel>
                    <QItemLabel caption>
                      Username
                    </QItemLabel>
                  </QItemSection>
                </QItem>

                <QItem>
                  <QItemSection avatar>
                    <QIcon name="business" />
                  </QItemSection>
                  <QItemSection>
                    <QItemLabel>{{ current.user.value?.department || '-' }}</QItemLabel>
                    <QItemLabel caption>
                      Service
                    </QItemLabel>
                  </QItemSection>
                </QItem>

                <QItem>
                  <QItemSection avatar>
                    <QIcon name="work" />
                  </QItemSection>
                  <QItemSection>
                    <QItemLabel>{{ current.user.value?.title || '-' }}</QItemLabel>
                    <QItemLabel caption>
                      Fonction
                    </QItemLabel>
                  </QItemSection>
                </QItem>
              </QList>
            </QCard>
          </div>

          <div class="col-12 col-md-8">
            <QCard flat bordered>
              <QCardSection class="row items-center justify-between">
                <div>
                  <div class="text-h6">
                    Attributs LDAP complets
                  </div>
                  <div class="text-caption text-grey-7">
                    Toutes les données LDAP retournées par le backend.
                  </div>
                </div>

                <QBtn
                  flat
                  dense
                  icon="refresh"
                  label="Actualiser"
                  :loading="current.loading.value"
                  @click="current.refresh"
                />
              </QCardSection>

              <QSeparator />

              <QTable
                flat
                :rows="ldapEntries"
                :columns="[
                  {
                    name: 'key',
                    label: 'Attribut',
                    field: 'key',
                    align: 'left',
                  },
                  {
                    name: 'value',
                    label: 'Valeur',
                    field: 'value',
                    align: 'left',
                  },
                ]"
                row-key="key"
                :pagination="{ rowsPerPage: 25 }"
              >
                <template #body-cell-value="props">
                  <QTd :props="props">
                    <pre class="q-ma-none whitespace-pre-wrap">{{ props.value }}</pre>
                  </QTd>
                </template>
              </QTable>
            </QCard>

            <QCard flat bordered class="q-mt-md">
              <QCardSection>
                <div class="text-h6">
                  Objet utilisateur complet
                </div>

                <pre class="q-mt-md bg-grey-2 q-pa-md rounded-borders overflow-auto">{{ current.user.value }}</pre>
              </QCardSection>
            </QCard>
          </div>
        </div>
      </div>

      <template #fallback>
        <div class="mx-auto max-w-6xl">
          <QCard flat bordered>
            <QCardSection>
              <QSkeleton type="text" width="30%" />
              <QSkeleton type="rect" height="220px" class="q-mt-md" />
            </QCardSection>
          </QCard>
        </div>
      </template>
    </ClientOnly>
  </QPage>
</template>
