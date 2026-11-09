# LAB2 — API REST de produits avec Spring Boot

API Java 21 / Spring Boot 3 construite selon les couches **Controller → Service → Repository**. Les données sont conservées dans une `ConcurrentHashMap` pendant l'exécution : elles disparaissent au redémarrage, car ce laboratoire ne configure pas encore de base de données.

Le projet implémente aussi les exercices du sujet : recherche insensible à la casse par nom, exception métier lorsque la quantité dépasse 1000 et DTOs Java `record`.

## Prérequis

- JDK 21
- Maven 3.6 ou supérieur
- Postman (facultatif, `curl` peut être utilisé à la place)

Vérifier les outils :

```bash
java -version
mvn -version
```

## Lancer l'API

Depuis le dossier `labs/lab2-springboot` :

```bash
mvn spring-boot:run
```

Le serveur démarre sur `http://localhost:8080`. L'API est vide au démarrage.

## Exécuter les tests automatisés

```bash
mvn test
```

Les tests couvrent la création/lecture, la recherche sans distinction de casse, la modification/suppression, les erreurs de validation, la quantité maximale et la ressource absente.

## Utiliser la collection Postman

1. Importer `postman/LAB2-Product-API.postman_collection.json`.
2. Démarrer l'API.
3. Ouvrir la collection et lancer **1. Créer un produit** en premier.
4. Le script de cette requête sauvegarde son identifiant dans `productId`.
5. Exécuter ensuite les requêtes de lecture, recherche, mise à jour et suppression. **La suppression est à lancer en dernier**, car les autres opérations utilisent le même produit.

L'environnement de la collection utilise `baseUrl=http://localhost:8080` et `productId=1`. Le script de création remplace l'identifiant par celui retourné par l'API.

## Endpoints

| Méthode | URL | Résultat |
|---|---|---|
| POST | `/api/products` | Crée un produit, statut `201 Created` |
| GET | `/api/products` | Liste tous les produits |
| GET | `/api/products/{id}` | Renvoie un produit ou `404 Not Found` |
| GET | `/api/products/search?name=laptop` | Recherche partielle sans distinction de casse |
| PUT | `/api/products/{id}` | Remplace les champs du produit, statut `200 OK` |
| DELETE | `/api/products/{id}` | Supprime le produit, statut `204 No Content` |

Exemple de corps JSON pour POST et PUT :

```json
{
  "name": "Ordinateur Portable",
  "description": "Laptop 15 pouces",
  "price": 1200.50,
  "quantity": 10
}
```

`name` doit être présent, `price` doit être strictement positif et `quantity` doit être positive ou nulle et ne pas dépasser 1000. Les erreurs de validation renvoient `400 Bad Request` avec les champs concernés. Une quantité supérieure à 1000 est traitée par `InvalidQuantityException`. Un identifiant inconnu renvoie `404 Not Found`.

## Tester avec curl

Créer et capturer la réponse :

```bash
curl -i -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ordinateur Portable\",\"description\":\"Laptop 15 pouces\",\"price\":1200.50,\"quantity\":10}"
```

Utiliser l'identifiant `id` de la réponse dans les appels suivants :

```bash
curl -i http://localhost:8080/api/products
curl -i http://localhost:8080/api/products/1
curl -i "http://localhost:8080/api/products/search?name=laptop"
curl -i -X PUT http://localhost:8080/api/products/1 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ordinateur Portable Pro\",\"description\":\"Laptop amélioré\",\"price\":1300.00,\"quantity\":8}"
curl -i -X DELETE http://localhost:8080/api/products/1
```

## Arborescence

```text
src/main/java/com/example/productapi/
├── controller/       # Routes HTTP
├── dto/              # ProductRequest et ProductResponse
├── exception/        # Exceptions métier et handler global
├── model/            # Modèle Product
├── repository/       # Stockage temporaire thread-safe
└── service/          # Logique métier et recherche
```

La réponse de création est bien HTTP `201`; elle ajoute également l'en-tête `Location`. Les opérations d'écriture ne sont pas persistées au redémarrage : l'ajout d'une base de données est l'objet du LAB3.
