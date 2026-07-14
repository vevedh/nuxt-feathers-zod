<script setup lang="ts">
const current = useCurrentLdapUser()
const keycloak = useKeycloakToken()
const sso = useSsoSessionStore()
const ldap = useLdapSessionStore()
const tokenPreview = computed(() => {
  const token = keycloak.token.value

  if (!token) {
    return null
  }

  return `${token.slice(0, 24)}...${token.slice(-16)}`
})
</script>

<template>
  <QPage padding>
    <ClientOnly>
      <div class="mx-auto max-w-6xl">
        <QCard flat bordered>
          <QCardSection class="row items-center justify-between">
            <div>
              <div class="text-h6">
                Debug Keycloak client-only + NFZ remote direct + LDAP backend
              </div>
              <div class="text-caption text-grey-7">
                La synchronisation automatique se lance après Keycloak. Ce bouton force un nouveau test manuel.
              </div>
            </div>

            <QBtn
              color="primary"
              icon="sync"
              label="Tester bridge"
              :loading="current.loading.value"
              @click="current.refresh"
            />
          </QCardSection>

          <QSeparator />

          <QCardSection>
            <QList bordered separator>
              <QItem>
                <QItemSection>
                  <QItemLabel>Keycloak prêt</QItemLabel>
                  <QItemLabel caption>
                    {{ sso.ready }}
                  </QItemLabel>
                </QItemSection>
              </QItem>

              <QItem>
                <QItemSection>
                  <QItemLabel>Keycloak authentifié</QItemLabel>
                  <QItemLabel caption>
                    {{ current.isSsoAuthenticated.value }}
                  </QItemLabel>
                </QItemSection>
              </QItem>

              <QItem>
                <QItemSection>
                  <QItemLabel>Token Keycloak</QItemLabel>
                  <QItemLabel caption>
                    {{ tokenPreview || 'absent' }}
                  </QItemLabel>
                </QItemSection>
              </QItem>

              <QItem>
                <QItemSection>
                  <QItemLabel>Feathers / LDAP synchronisé</QItemLabel>
                  <QItemLabel caption>
                    {{ current.isFeathersAuthenticated.value }}
                  </QItemLabel>
                </QItemSection>
              </QItem>

              <QItem>
                <QItemSection>
                  <QItemLabel>Utilisateur LDAP</QItemLabel>
                  <QItemLabel caption>
                    {{ current.user.value?.username || '-' }}
                  </QItemLabel>
                </QItemSection>
              </QItem>
            </QList>

            <QBanner
              v-if="current.error.value"
              class="bg-red-1 text-red-10 q-mt-md"
              rounded
            >
              {{ current.error.value }}
            </QBanner>
          </QCardSection>
        </QCard>

        <QCard flat bordered class="q-mt-md">
          <QCardSection>
            <div class="text-h6">
              ssoUser Keycloak
            </div>

            <pre class="bg-grey-2 q-pa-md rounded-borders overflow-auto">{{ sso.tokenParsed }}</pre>
          </QCardSection>
        </QCard>

        <QCard flat bordered class="q-mt-md">
          <QCardSection>
            <div class="text-h6">
              user LDAP
            </div>

            <pre class="bg-grey-2 q-pa-md rounded-borders overflow-auto">{{ ldap.currentUser }}</pre>
          </QCardSection>
        </QCard>
      </div>

      <template #fallback>
        <div class="mx-auto max-w-6xl">
          <QCard flat bordered>
            <QCardSection>
              <QSkeleton type="text" width="40%" />
              <QSkeleton type="rect" height="180px" class="q-mt-md" />
            </QCardSection>
          </QCard>
        </div>
      </template>
    </ClientOnly>
  </QPage>
</template>
