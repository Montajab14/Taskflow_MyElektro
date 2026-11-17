# MyElektro — Front

Gestionnaire d'étapes de projets électroniques (sujet TaskFlow). Front en HTML/CSS/JS natif, sans dépendance.

## Lancer
```bash
npm start        # sert src/ sur http://localhost:3000
```

## Brancher la vraie API
Dans `src/js/config.js` :
```js
useMock: false,                       // true = faux backend en localStorage
apiUrl: 'http://localhost:3001/api',
```
En mode mock, tout fonctionne sans serveur (utile avant que `/api/tasks` soit prêt).

## Contrat attendu de l'API
| Action | Requête | Réponse |
|---|---|---|
| Inscription | `POST /auth/register {email,password,name?}` | `201 {token,user}` |
| Connexion | `POST /auth/login {email,password}` | `200 {token,user}` |
| Liste | `GET /tasks` | tableau, ou `{tasks:[…]}` |
| Détail | `GET /tasks/:id` | tâche, ou `{task:{…}}` |
| Ajout | `POST /tasks {title,status,description,dueDate}` | `201` + tâche |
| Édition | `PUT /tasks/:id` (corps complet) | `200` + tâche |
| Suppression | `DELETE /tasks/:id` | `204` ou `200` |

Toutes les routes `/tasks` : en-tête `Authorization: Bearer <jwt>`. Erreurs : `{error, details:[{field,message}]}`.
Tâche d'un autre utilisateur : `404`. Si le backend utilise `PATCH` au lieu de `PUT`, changer `updateTask` dans `src/js/api.js`.

## Statuts
Valeurs envoyées à l'API : `todo`, `doing`, `done`. Libellés affichés : À faire / Sur le bench / Validé (`STATUS_LABELS` dans `src/js/app.js`).

## Structure
```
src/index.html        écrans (auth + application)
src/css/style.css     thème « carte électronique »
src/js/config.js      apiUrl, useMock
src/js/validate.js    règles de validation (mêmes que l'API)
src/js/api.js         client HTTP, Bearer, erreurs, déconnexion sur 401
src/js/mock.js        faux backend localStorage
src/js/app.js         routeur #/… et vues (liste, détail, formulaire, suppression)
```
