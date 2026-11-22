import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import {
  validateId,
  validateProduct,
  validateProductPatch
} from '../middlewares/validator.middleware.js';

const router = Router();

router.get(
  '/',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Lister tous les produits'
  */
  productController.getAll
);

router.get(
  '/:id',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Obtenir un produit par ID'
  */
  validateId,
  productController.getById
);

router.post(
  '/',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Créer un produit'
  */
  validateProduct,
  productController.create
);

router.put(
  '/:id',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Mettre à jour un produit'
  */
  validateId,
  validateProduct,
  productController.update
);

router.patch(
  '/:id',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Modifier partiellement un produit'
  */
  validateId,
  validateProductPatch,
  productController.patch
);

router.delete(
  '/:id',
  /* #swagger.tags = ['Products']
     #swagger.summary = 'Supprimer un produit'
  */
  validateId,
  productController.remove
);

export default router;
