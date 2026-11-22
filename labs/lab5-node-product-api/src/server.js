import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/error.middleware.js';
import productRoutes from './routes/product.routes.js';

dotenv.config();

await import('../swagger.js');

const app = express();
const PORT = process.env.PORT || 3000;
const swaggerFile = new URL('./docs/swagger-output.json', import.meta.url);
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFile, 'utf8'));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API REST Product - LAB 5" });
});

app.use('/api/products', productRoutes);

app.get('/api-docs.json', (req, res) => {
  res.json(swaggerDocument);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { status: 404, message: 'Route non trouvée' }
  });
});

app.use(errorHandler);

const isMainModule = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`API : http://localhost:${PORT}/api/products`);
    console.log(`Swagger : http://localhost:${PORT}/api-docs`);
  });
}

export { app };
