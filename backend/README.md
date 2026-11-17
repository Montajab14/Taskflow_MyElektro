# TaskFlow — API

API REST de TaskFlow, un gestionnaire de tâches personnelles : chaque utilisateur ne voit et ne modifie que ses propres tâches.

**Stack** : Node.js, Express 5, MongoDB et Mongoose, bcrypt, JWT, Jest et Supertest, Swagger (OpenAPI 3).

## Installation

Prérequis : Node.js 20 ou plus récent, et MongoDB 5 ou plus récent (le `docker-compose.yml` à la racine du dépôt en fournit un).

```bash
cd backend
npm install
cp .env.example .env
```

Dans `backend/.env`, renseignez au minimum `JWT_SECRET`, par exemple avec la valeur produite par :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Option 1 : l'API sur votre machine, MongoDB dans Docker

```bash
# depuis la racine du dépôt
docker compose up -d mongodb

# puis dans backend/
npm run dev     # avec rechargement automatique (nodemon)
npm start       # sans rechargement
```

Le `MONGO_URI` de `.env.example` pointe déjà vers ce conteneur (`admin` / `secret123`, base `taskflow`).
Avec MongoDB Atlas, collez simplement l'URI de connexion dans `MONGO_URI`.

- API : http://localhost:3001 (le port 3000 est celui du serveur du front)
- Documentation Swagger interactive : http://localhost:3001/api/docs
- Spécification OpenAPI brute : http://localhost:3001/api/docs.json

### Option 2 : tout dans Docker

À la racine du dépôt, créez un fichier `.env` contenant `JWT_SECRET=...` (voir `.env.example`), puis :

```bash
docker compose up -d --build
```

L'API est alors sur http://localhost:3002, et sa documentation sur http://localhost:3002/api/docs.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance l'API avec nodemon |
| `npm start` | Lance l'API |
| `npm test` | Lance les tests Jest et Supertest |
| `npm run lint` | Vérifie le code avec ESLint |

Les tests n'ont besoin ni de `.env` ni de MongoDB installé : ils démarrent une base jetable en mémoire (`mongodb-memory-server`). Au premier lancement, le binaire `mongod` est téléchargé, ce qui prend environ une minute.

## Routes

Toutes les routes, sauf celles d'inscription, de connexion, de santé et de documentation, exigent l'en-tête `Authorization: Bearer <token>`.

| Méthode | Route | Succès | Erreurs |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 201 `{ token, user }` | 400, 409, 429 |
| POST | `/api/auth/login` | 200 `{ token, user }` | 400, 401, 429 |
| GET | `/api/auth/me` | 200 `{ user }` | 401 |
| GET | `/api/tasks` | 200 `[Task]` | 400, 401 |
| POST | `/api/tasks` | 201 `Task` | 400, 401 |
| GET | `/api/tasks/:id` | 200 `Task` | 401, 404 |
| PUT | `/api/tasks/:id` | 200 `Task` | 400, 401, 404 |
| PATCH | `/api/tasks/:id` | 200 `Task` | 400, 401, 404 |
| DELETE | `/api/tasks/:id` | 204 | 401, 404 |
| GET | `/api/stats/summary` | 200 | 401 |
| GET | `/api/stats/heatmap` | 200 | 400, 401 |
| GET | `/api/stats/weekly` | 200 | 400, 401 |
| GET | `/api/habits` | 200 `[Habit + stats]` | 400, 401 |
| POST | `/api/habits` | 201 `Habit` | 400, 401 |
| GET | `/api/habits/:id` | 200 `Habit + stats` | 400, 401, 404 |
| PUT | `/api/habits/:id` | 200 `Habit` | 400, 401, 404 |
| PATCH | `/api/habits/:id` | 200 `Habit` | 400, 401, 404 |
| DELETE | `/api/habits/:id` | 204 | 401, 404 |
| GET | `/api/habits/:id/completions` | 200 `[{ date, createdAt }]` | 400, 401, 404 |
| PUT | `/api/habits/:id/completions/:date` | 201, ou 200 si déjà coché | 400, 401, 404 |
| DELETE | `/api/habits/:id/completions/:date` | 204 | 400, 401, 404 |
| GET | `/api/health` | 200 `{ status: "ok" }` | |

Corps attendus : `register` reçoit `{ email, password, name? }` (mot de passe de 8 caractères au moins, nom facultatif de 2 à 60 caractères), `login` reçoit `{ email, password }`. `user` vaut `{ id, email, name, createdAt }`.

### La ressource Task

| Champ | Règle |
| --- | --- |
| `title` | obligatoire, 1 à 120 caractères après suppression des espaces (stocké sans eux) |
| `status` | obligatoire, `todo`, `doing` ou `done` |
| `description` | facultatif, chaîne de 0 à 1000 caractères, `""` accepté, `""` par défaut |
| `dueDate` | facultatif, date réelle `YYYY-MM-DD` (`2026-02-30` est refusée) ou `null`, `null` par défaut |
| `priority` | bonus B1, facultatif : `low`, `medium` ou `high`, `medium` par défaut |

Le serveur ajoute `id`, `completedAt` (renseigné quand la tâche passe à `done`), `createdAt` et `updatedAt`.
`PUT` remplace la tâche : les champs facultatifs absents reprennent leur valeur par défaut. `PATCH` ne modifie que les champs envoyés.

### Format des erreurs

```json
{
  "error": "Données invalides",
  "details": [
    { "field": "title", "message": "Le titre doit contenir entre 1 et 120 caractères" },
    { "field": "status", "message": "Le statut doit valoir todo, doing, done" }
  ]
}
```

`details` n'apparaît que pour les erreurs de validation (400), et liste toutes les erreurs en une seule réponse.

### Bonus

- **B1, filtres** sur `GET /api/tasks` : `status=todo,doing`, `priority=high`, `dueAfter=2026-11-01`, `dueBefore=2026-11-30`, `overdue=true`, `q=texte` et `sort=dueDate` (ou `-createdAt` par défaut, `title`, `updatedAt`, avec `-` pour l'ordre décroissant).
- **B1, compteur** : `GET /api/stats/summary` renvoie le total, le nombre par statut et par priorité, le nombre de tâches en retard et le taux de complétion.
- **B2, habitudes** : une habitude a un nom (1 à 80 caractères) et une description facultative (0 à 500). On la coche jour par jour avec `PUT /api/habits/:id/completions/2026-11-17`, ce qui est idempotent : une seule réalisation par jour, et les jours futurs sont refusés. `DELETE` sur la même URL décoche le jour. `GET /api/habits` renvoie pour chaque habitude un objet `stats` : `total`, `currentStreak` (jours consécutifs jusqu'à aujourd'hui ou hier), `longestStreak`, `lastCompletedOn` et `doneToday`. Supprimer une habitude supprime ses réalisations.
- **B3, heatmap** : `GET /api/stats/heatmap?from=2026-01-01&to=2026-12-31&tz=Europe/Paris` renvoie les tâches terminées par jour, jours vides inclus. Par défaut, ce sont les 365 derniers jours.
- **B4, statistiques** : `GET /api/stats/weekly?weeks=12&tz=Europe/Paris` renvoie, pour chaque semaine du lundi au dimanche, les tâches créées, les tâches terminées et le taux de complétion.

Les agrégations sont faites par MongoDB (`$group`, `$facet`, `$dateTrunc`) et non en JavaScript.

## Architecture

```
src/
├── server.js          connexion à MongoDB puis démarrage HTTP
├── app.js             application Express, sans listen : réutilisée par les tests
├── config/            variables d'environnement, connexion à la base
├── routes/            associe URL et méthode à un contrôleur, applique l'authentification
├── controllers/       lit la requête, appelle la validation et le service, choisit le code HTTP
├── services/          logique métier et accès à MongoDB
├── models/            schémas Mongoose (User, Task)
├── validators/        règles de validation du contrat
├── middlewares/       authentification Bearer, 404, gestion centralisée des erreurs
├── docs/              spécification OpenAPI
└── utils/
tests/                 Jest et Supertest
```

Parcours d'une requête : `route → middleware auth → contrôleur → validateur → service → modèle Mongoose → MongoDB`. Toute erreur levée en chemin remonte jusqu'à `middlewares/errorHandler.js`, qui produit la réponse JSON.

## Pourquoi les données sont privées

1. **Les mots de passe ne sont jamais stockés en clair.** Seul leur hash bcrypt est enregistré, et il est exclu par défaut des lectures (`select: false`). Un e-mail inconnu et un mauvais mot de passe donnent la même réponse, dans le même temps, ce qui empêche de deviner quels comptes existent.
2. **Les mots de passe ne peuvent pas être essayés en boucle.** Après 10 échecs d'inscription ou de connexion en 15 minutes depuis la même adresse IP, l'API répond 429 avec un en-tête `Retry-After`. Les connexions réussies ne comptent pas, donc un utilisateur normal n'est jamais bloqué. Réglable avec `AUTH_RATE_LIMIT_MAX` et `AUTH_RATE_LIMIT_WINDOW_MIN`.
3. **L'identité vient du JWT, pas du client.** Le middleware vérifie la signature et l'expiration du jeton avec `JWT_SECRET`, que seul le serveur connaît, puis place l'id du compte dans `req.user.id`. Un jeton modifié ou signé avec une autre clé est refusé (401).
4. **Chaque requête en base est filtrée par propriétaire.** Le service ne cherche jamais une tâche, une habitude ou une réalisation par son seul `_id`, mais toujours par `{ _id, owner: req.user.id }`. La tâche d'un autre compte est donc introuvable, et l'API répond 404, exactement comme pour une tâche inexistante, sans même révéler qu'elle existe.
5. **Le client ne choisit pas le propriétaire.** Les champs `owner`, `id` ou `completedAt` envoyés dans le corps sont ignorés par le validateur.

Ces garanties sont vérifiées par `tests/isolation.test.js` : deux comptes, et des tentatives de lecture, de modification et de suppression croisées par requête HTTP directe.

## Tests

`npm test` lance 162 tests répartis en 10 fichiers :

- `app.test.js` : route de santé, 404, JSON mal formé, documentation Swagger
- `auth.test.js` : inscription, connexion, hash bcrypt, jetons absents, falsifiés ou expirés
- `tasks.test.js` : CRUD, cas limites, toutes les règles de validation, filtres, persistance après reconnexion
- `isolation.test.js` : accès croisés entre deux comptes
- `rateLimit.test.js` : blocage après trop d'échecs de connexion, sans gêner les connexions réussies
- `stats.test.js` : compteurs, heatmap (y compris le changement de jour selon le fuseau), statistiques hebdomadaires
- `habits.test.js` : CRUD des habitudes, validation, isolation entre comptes
- `habits.completions.test.js` : jours cochés et décochés, idempotence, requêtes simultanées, jours futurs, fuseau horaire, isolation
- `habits.stats.test.js` : calcul des séries en cours et des plus longues séries
- `date.test.js` : validation des dates `YYYY-MM-DD`, calculs sur les jours, fuseaux horaires
