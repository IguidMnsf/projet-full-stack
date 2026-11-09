# TP1 — API REST et Postman

Ce dossier contient les livrables du laboratoire :

- `TP1-API-REST-Postman.postman_collection.json` : collection Postman v2.1 avec les requêtes, les tests et les dossiers du TP.
- `Demo-API-Env.postman_environment.json` : environnement Postman prêt à importer.
- `rapport-tp1.md` : rapport des observations, également fourni en PDF.
- `rapport-tp1.pdf` : rapport à remettre.

## Importer dans Postman

1. Dans Postman, choisissez **Import** puis importez les deux fichiers `.json`.
2. Dans la liste des environnements, sélectionnez **Demo API Env**.
3. Ouvrez la collection **LAB1 - Gestion Produits REST**.
4. Exécutez les requêtes. Les scripts affichent les assertions dans **Test Results**.
5. Pour exécuter toute la collection, utilisez le **Collection Runner**. L'ordre des requêtes est organisé par dossier.

L'environnement contient `baseUrl`, `productId` et `createdProductId`. La requête de création initialise `createdProductId` à partir de la réponse.

## Résultats à interpréter

DummyJSON est une API de démonstration : ses opérations d'ajout, de modification et de suppression sont simulées et ne constituent pas une persistance durable. Le temps de réponse peut dépasser 500 ms selon le réseau ; ce test mesure aussi la connexion utilisée pour l'exercice.

Les codes HTTP observés lors de la préparation du rapport sont consignés dans `rapport-tp1.md`. Les résultats peuvent varier dans le temps ou selon le service distant.
