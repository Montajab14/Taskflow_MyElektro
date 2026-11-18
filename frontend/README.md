# TaskFlow — Front

Interface web de TaskFlow en HTML, CSS et JavaScript natifs, servie par un petit serveur Node.js sans dépendance.

## Lancer

```bash
cd frontend
npm start        # sert src/ sur http://localhost:3000
npm run dev      # idem, avec rechargement automatique
```

Le fichier `src/index.html` peut aussi s'ouvrir directement dans le navigateur (double-clic, ou Live Server dans VS Code).

Avec Docker, le front est lancé par le `docker-compose.yml` à la racine du dépôt (service `frontend`). Le dossier `src/` est monté dans le conteneur : une modification est visible sans reconstruire l'image.

## Structure

```text
frontend/
├── Dockerfile
├── package.json
└── src/
    ├── index.html        # page principale (connexion et inscription)
    ├── index.js          # serveur Node.js natif (npm start)
    ├── css/
    │   └── style.css     # styles
    └── js/
        └── script.js     # onglets, force du mot de passe, validation, notifications
```

## Fonctionnalités

- Bascule entre les onglets *Connexion* et *Inscription*.
- Affichage et masquage du mot de passe.
- Indicateur de force du mot de passe en temps réel.
- Validation des champs : format de l'e-mail, longueur du mot de passe, confirmation, CGU.
- Persistance simulée dans le `localStorage`, avec un compte de démonstration :
  - e-mail : `demo@taskflow.io`
  - mot de passe : `TaskFlow2026!`

## API

L'API REST se trouve dans [`../backend`](../backend/README.md). En local, elle répond sur http://localhost:3001/api.
