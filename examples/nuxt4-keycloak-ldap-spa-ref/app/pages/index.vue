<script setup lang="ts">
const current = useCurrentLdapUser()
</script>

<template>
  <QPage padding>
    <div class="mx-auto max-w-5xl">
      <QCard flat bordered>
        <QCardSection>
          <div class="text-h5">
            Exemple Nuxt 4 + NFZ + Keycloak client-only + LDAP backend
          </div>

          <p class="text-grey-7">
            Keycloak est initialisé uniquement côté client Nuxt. NFZ reste le client Feathers remote.
            Après le succès Keycloak, la synchronisation LDAP est lancée automatiquement via NFZ remote
            <code>strategy: keycloak-ldap</code>. Le bouton reste disponible pour forcer une resynchronisation.
          </p>

          <QBanner class="bg-blue-1 text-blue-10 q-mb-md" rounded>
            Modèle de référence : aucun proxy Nitro local. NFZ 6.6.0 appelle directement
            le backend Feathers remote <code>/authentication</code>. Le backend doit donc gérer
            correctement CORS et <code>OPTIONS</code>. Keycloak reste 100 % client-only.
          </QBanner>

          <div class="row q-gutter-sm">
            <QBtn
              v-if="!current.isSsoAuthenticated.value"
              color="primary"
              icon="login"
              label="Connexion Keycloak"
              @click="current.login"
            />

            <QBtn
              v-else
              color="primary"
              icon="sync"
              label="Synchroniser LDAP"
              :loading="current.loading.value"
              @click="current.refresh"
            />

            <QBtn
              outline
              color="primary"
              icon="person"
              label="Voir profil"
              to="/profil"
            />

            <QBtn
              flat
              color="negative"
              icon="logout"
              label="Déconnexion"
              @click="current.logout"
            />
          </div>
        </QCardSection>
      </QCard>

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-md-6">
          <QCard flat bordered>
            <QCardSection>
              <div class="text-h6">
                Session Keycloak client-only
              </div>
              <QList dense>
                <QItem>
                  <QItemSection>Authentifié SSO</QItemSection>
                  <QItemSection side>
                    <QBadge :color="current.isSsoAuthenticated.value ? 'positive' : 'grey'">
                      {{ current.isSsoAuthenticated.value }}
                    </QBadge>
                  </QItemSection>
                </QItem>
                <QItem>
                  <QItemSection>Utilisateur SSO</QItemSection>
                  <QItemSection side>
                    {{ current.ssoUser.value?.preferred_username || current.ssoUser.value?.email || '-' }}
                  </QItemSection>
                </QItem>
              </QList>
            </QCardSection>
          </QCard>
        </div>

        <div class="col-12 col-md-6">
          <QCard flat bordered>
            <QCardSection>
              <div class="text-h6">
                Session Feathers / LDAP
              </div>
              <QList dense>
                <QItem>
                  <QItemSection>Synchronisé LDAP</QItemSection>
                  <QItemSection side>
                    <QBadge :color="current.isFeathersAuthenticated.value ? 'positive' : 'grey'">
                      {{ current.isFeathersAuthenticated.value }}
                    </QBadge>
                  </QItemSection>
                </QItem>
                <QItem>
                  <QItemSection>Utilisateur LDAP</QItemSection>
                  <QItemSection side>
                    {{ current.user.value?.username || '-' }}
                  </QItemSection>
                </QItem>
              </QList>
            </QCardSection>
          </QCard>
        </div>
      </div>

      <QBanner
        v-if="current.error.value"
        class="bg-red-1 text-red-10 q-mt-md"
        rounded
      >
        {{ current.error.value }}
      </QBanner>
    </div>
  </QPage>
</template>
