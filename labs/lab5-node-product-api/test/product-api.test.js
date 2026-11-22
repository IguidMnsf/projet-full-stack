import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';
import { productRepository } from '../src/repositories/product.repository.js';

beforeEach(async () => {
  await productRepository.reset();
});

test('GET / renvoie le message de bienvenue', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.match(response.body.message, /LAB 5/);
});

test('CRUD complet avec GET, POST, PUT, PATCH et DELETE', async () => {
  const create = await request(app).post('/api/products').send({
    name: 'Écran Samsung',
    price: 2500,
    stock: 20
  });
  assert.equal(create.status, 201);
  assert.equal(create.body.data.name, 'Écran Samsung');

  const id = create.body.data.id;
  const read = await request(app).get(`/api/products/${id}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.data.id, id);

  const update = await request(app).put(`/api/products/${id}`).send({
    name: 'Écran Samsung Pro',
    price: 2750,
    stock: 18
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.stock, 18);

  const patch = await request(app).patch(`/api/products/${id}`).send({
    price: 2600
  });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.price, 2600);
  assert.equal(patch.body.data.name, 'Écran Samsung Pro');

  const remove = await request(app).delete(`/api/products/${id}`);
  assert.equal(remove.status, 204);
});

test('GET renvoie 404 pour un produit inexistant', async () => {
  const response = await request(app).get('/api/products/999');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.message, 'Produit non trouvé');
});

test('POST rejette un corps invalide', async () => {
  const response = await request(app).post('/api/products').send({
    name: '',
    price: -1
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.errors.length > 0);
});

test('GET rejette un identifiant invalide', async () => {
  const response = await request(app).get('/api/products/1abc');
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test('une route inconnue renvoie 404', async () => {
  const response = await request(app).get('/api/unknown');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.message, 'Route non trouvée');
});

test('Swagger JSON est disponible', async () => {
  const response = await request(app).get('/api-docs.json');
  assert.equal(response.status, 200);
  assert.equal(response.body.openapi, '3.0.0');
  assert.ok(
    response.body.paths['/api/products']
    || response.body.paths['/api/products/']
  );
});
