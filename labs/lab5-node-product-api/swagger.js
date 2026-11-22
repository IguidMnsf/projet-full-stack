import swaggerAutogen from 'swagger-autogen';
import { fileURLToPath } from 'node:url';

const generateSwagger = swaggerAutogen({ openapi: '3.0.0' });

const document = {
  info: {
    title: 'API Produits',
    version: '1.0.0',
    description: 'Documentation de l’API REST de gestion des produits'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Serveur local'
    }
  ],
  tags: [
    {
      name: 'Products',
      description: 'Gestion des produits'
    }
  ],
  components: {
    schemas: {
      ProductInput: {
        type: 'object',
        required: ['name', 'price', 'stock'],
        properties: {
          name: { type: 'string', example: 'Écran 24 pouces' },
          price: { type: 'number', minimum: 0, example: 199.99 },
          stock: { type: 'integer', minimum: 0, example: 10 }
        }
      },
      ProductPatch: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Écran 27 pouces' },
          price: { type: 'number', minimum: 0, example: 249.99 },
          stock: { type: 'integer', minimum: 0, example: 8 }
        }
      },
      Product: {
        allOf: [
          { $ref: '#/components/schemas/ProductInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 }
            }
          }
        ]
      }
    }
  }
};

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const previousDirectory = process.cwd();

try {
  process.chdir(projectRoot);
  await generateSwagger(
    './src/docs/swagger-output.json',
    ['./src/server.js'],
    document
  );
} finally {
  process.chdir(previousDirectory);
}
