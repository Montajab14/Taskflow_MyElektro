# TaskFlow

Application web de gestion de tâches : chaque utilisateur crée un compte, se connecte et gère ses propres tâches. Une API REST sécurisée par JWT stocke les données dans MongoDB, et un front web les affiche.

| Partie | Technologies | Dossier |
| --- | --- | --- |
| Front | HTML, CSS et JavaScript natifs, serveur Node.js | [`frontend/`](frontend/README.md) |
| API | Node.js 20+, Express 5, Mongoose, JWT, bcrypt, Swagger | [`backend/`](backend/README.md) |
| Base de données | MongoDB 7 | lancée par `docker-compose.yml` |
| Tests | Jest, Supertest, mongodb-memory-server (166 tests) | `backend/tests/` |

---

## Structure du dépôt

```text
.
├── frontend/             # interface web (voir frontend/README.md)
│   ├── Dockerfile
│   ├── package.json
│   └── src/              # index.html, css/, js/ et le serveur index.js
├── backend/              # API REST (voir backend/README.md)
│   ├── Dockerfile
│   ├── package.json
│   ├── src/              # routes, contrôleurs, services, modèles, validateurs
│   └── tests/            # tests d'intégration et unitaires
├── docker-compose.yml    # MongoDB, Mongo Express, API et front
├── .env.example          # variables du docker-compose (à copier en .env)
└── README.md
```

---

## Démarrage rapide (Docker)

Prérequis : Docker avec Docker Compose.

```bash
cp .env.example .env      # puis renseigner MONGO_ROOT_PASSWORD et JWT_SECRET
docker compose up -d --build
```

| Service | Adresse |
| --- | --- |
| Front | http://localhost:3000 |
| API | http://localhost:3001/api |
| Documentation de l'API (Swagger) | http://localhost:3001/api/docs |
| Mongo Express (voir la base) | http://localhost:8081 |
| MongoDB | `localhost:27017` |

Si le port 27017 est déjà pris sur votre machine, lancez `MONGO_PORT=27019 docker compose up -d --build`.

Pour tout arrêter : `docker compose down`. Pour effacer aussi la base : `docker compose down -v`.

Aucun identifiant n'est versionné : le compose refuse de démarrer tant que `MONGO_ROOT_PASSWORD` n'est pas renseigné dans `.env`, et l'API refuse de démarrer sans `JWT_SECRET`.

---

## Développement sans Docker

Chaque partie se lance seule depuis son dossier. MongoDB peut rester dans Docker :

```bash
cp .env.example .env                 # puis renseigner MONGO_ROOT_PASSWORD et JWT_SECRET
docker compose up -d mongodb         # base de données seule

cd backend
npm install
cp .env.example .env                 # puis renseigner MONGO_URI et JWT_SECRET
npm run dev                          # API sur http://localhost:3001
npm test                             # 166 tests, sans base à installer

cd ../frontend
npm start                            # front sur http://localhost:3000
```

Les détails sont dans [`backend/README.md`](backend/README.md) et [`frontend/README.md`](frontend/README.md).

---

## Fonctionnalités

**Socle**

- Inscription et connexion : mots de passe hachés avec bcrypt, sessions par jeton JWT.
- Tâches privées : création, lecture, modification et suppression. Un utilisateur ne voit jamais les tâches d'un autre (réponse 404).
- Validation de toutes les entrées, avec des erreurs détaillées champ par champ : `{ error, details: [{ field, message }] }`.
- Protection contre les essais de mots de passe en série : après 10 échecs, l'API répond 429 pendant 15 minutes.

**Bonus**

- **B1, priorités et filtres** : priorité `low`, `medium` ou `high` ; filtres par statut, priorité, échéance, retard, texte ; tri ; compteur par statut.
- **B2, habitudes** : on coche une habitude jour par jour, avec la série en cours et la meilleure série.
- **B3, heatmap** : tâches terminées par jour sur l'année.
- **B4, statistiques** : tâches créées et terminées par semaine, avec le taux de complétion.

La liste complète des routes est dans [`backend/README.md`](backend/README.md#routes), et testable dans Swagger.

---

## Organisation du travail

- Une branche par fonctionnalité (`feat/…`, `fix/…`, `refactor/…`), fusionnée dans la branche de sa partie (`backend` ou `frontend`), puis dans `main`.
- Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) : `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`.
- Les fichiers `.env`, les secrets et `node_modules/` ne sont jamais versionnés.
