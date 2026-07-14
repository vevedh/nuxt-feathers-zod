# Scénarios de validation du playground

Le scénario actif est calculé à partir des variables d’environnement et affiché sur le tableau de bord ainsi que dans `/validation`.

## Méthode de test

1. Copier les variables du scénario choisi dans `playground/.env` ou dans le `.env` de la racine.
2. Lancer `bun run dev`.
3. Ouvrir `/` et exécuter les contrôles rapides.
4. Continuer avec `/tests`, puis la page spécialisée correspondant au scénario.

## Embedded avec authentification locale

```dotenv
NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=false
```

À contrôler : connexion locale, restauration de session, services `messages`, `users` et `actions`.

## Embedded avec MongoDB mémoire

```dotenv
NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=true
```

À contrôler : démarrage de MongoMemoryServer, service `mongos`, pages `/mongo` et `/messages`.

## Embedded avec une URL MongoDB

```dotenv
NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=true
NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL=mongodb://root:changeMe@localhost:27017/app?authSource=admin
NFZ_PLAYGROUND_EMBEDDED_MONGODB_FALLBACK_TO_MEMORY=true
```

Le fallback mémoire est utilisé uniquement si l’URL externe est indisponible et si l’option reste activée.

## Embedded avec Keycloak

```dotenv
NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=true
KC_URL=https://sso.example.com
KC_REALM=myrealm
KC_CLIENT_ID=myclient
```

À contrôler : redirection SSO, profil courant, renouvellement de token, déconnexion et accès aux services embedded.

## Distant avec REST

```dotenv
NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=rest
NFZ_REMOTE_URL=http://localhost:3030
NFZ_REMOTE_REST_PATH=/
NFZ_KEYCLOAK_ENABLED=false
```

À contrôler : endpoint calculé, requête `fetch()` brute, requête Feathers et éventuelles erreurs CORS.

## Distant avec Socket.IO et JWT stocké

```dotenv
NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=socketio
NFZ_REMOTE_URL=http://localhost:3030
NFZ_REMOTE_WS_PATH=/socket.io
NFZ_REMOTE_AUTH_PAYLOAD_MODE=jwt
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=accessToken
NFZ_REMOTE_AUTH_STORAGE_KEY=feathers-jwt
NFZ_KEYCLOAK_ENABLED=false
```

Le token peut être écrit dans `localStorage` depuis la section avancée de `/tests`.

## Distant avec Socket.IO et Keycloak

```dotenv
NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=socketio
NFZ_REMOTE_URL=https://api.domain.ltd
NFZ_REMOTE_REST_PATH=/api/v1
NFZ_REMOTE_WS_PATH=/socket.io
NFZ_REMOTE_AUTH_PAYLOAD_MODE=keycloak
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=access_token
NFZ_KEYCLOAK_ENABLED=true
KC_URL=https://sso.example.com
KC_REALM=myrealm
KC_CLIENT_ID=myclient
```

À contrôler : SSO, injection du token dans le payload Feathers, reconnexion Socket.IO et restauration de session.

## Endpoints MongoDB utiles

- `/feathers/mongo/databases`
- `/feathers/mongo/<db>/collections`
- `/feathers/mongo/<db>/stats`
- `/feathers/mongo/<db>/<collection>/indexes`
- `/feathers/mongo/<db>/<collection>/count`
- `/feathers/mongo/<db>/<collection>/schema`
- `/feathers/mongo/<db>/<collection>/documents`
