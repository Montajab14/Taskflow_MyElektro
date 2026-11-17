// Variables d'environnement pour les tests : aucun .env n'est nécessaire.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secret-de-test-uniquement';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // hash rapide en test
