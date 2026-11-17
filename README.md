# 📋 TaskFlow — Page d'Authentification

Projet d'authentification moderne pour l'application **TaskFlow** (Connexion et Inscription avec mot de passe).

---

## 🏗️ Architecture du Projet

```text
Tastkflow/
├── package.json          # Configuration npm et scripts de lancement
├── README.md             # Guide d'utilisation du projet
├── docker-compose.yml    # MongoDB, Mongo Express, front et API
├── backend/              # API REST Express + MongoDB (voir backend/README.md)
└── src/
    ├── index.html        # Page HTML principale (Auth Login / Inscription)
    ├── index.js          # Serveur Node.js natif (exécuté avec `npm start`)
    ├── css/
    │   └── style.css     # Styles CSS modernes et responsive
    └── js/
        └── script.js     # Logique JS (onglets, force mot de passe, validation, notifications)
```

---

## 🚀 Comment lancer le projet ?

### Méthode 1 : Sans Node.js (Directement dans le navigateur)
Vous pouvez simplement ouvrir le fichier `src/index.html` :
- **Double-cliquez** sur `src/index.html` dans l'explorateur Windows, ou
- Faites un clic droit > **Ouvrir avec** > **Google Chrome** (ou votre navigateur préféré).
- Si vous utilisez l'extension **Live Server** dans VS Code : faites un clic droit sur `src/index.html` > **Open with Live Server**.

### Méthode 2 : Avec Node.js (Serveur local)
Une fois Node.js installé sur votre machine :
```bash
# Lancer le serveur local :
npm start

# Ou avec rechargement automatique en développement :
npm run dev
```
Puis ouvrez votre navigateur à l'adresse : **[http://localhost:3000](http://localhost:3000)**.

---

## ✨ Fonctionnalités incluses

- 🔄 **Bascule d'onglets fluide** entre *Connexion* et *Inscription*.
- 👁️ **Affichage / Masquage du mot de passe** en un clic.
- 🔒 **Indicateur de force du mot de passe** en temps réel (couleur + jauge + libellé).
- ✅ **Validation complète des entrées** (format email, taille de mot de passe, confirmation identique, CGU).
- 💾 **Persistance simulée via `localStorage`** (vous pouvez créer un compte et vous connecter immédiatement).
- 🏷️ **Compte démo intégré** :
  - **Email** : `demo@taskflow.io`
  - **Mot de passe** : `TaskFlow2026!`

---

## 🔌 API backend

L'API REST (Express, MongoDB, JWT) se trouve dans [`backend/`](backend/README.md) : inscription, connexion, CRUD des tâches privées à chaque compte, filtres, heatmap et statistiques.

```bash
docker compose up -d mongodb          # base de données
cd backend && npm install && cp .env.example .env   # puis renseigner JWT_SECRET
npm run dev                           # API sur http://localhost:3001
```

- Documentation interactive (Swagger) : http://localhost:3001/api/docs
- Tests : `npm test` dans `backend/`

Le détail (routes, format des erreurs, confidentialité des données) est dans [`backend/README.md`](backend/README.md).
