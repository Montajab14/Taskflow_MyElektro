# Image de base légère Node.js (version 20 LTS)
FROM node:20-alpine

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (s'il y en a)
RUN npm install || true

# Copie des sources du projet
COPY . .

# Port exposé pour le serveur TaskFlow
EXPOSE 3000

# Commande de démarrage par défaut
CMD ["npm", "start"]

