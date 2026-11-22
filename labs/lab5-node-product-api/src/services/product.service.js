import { productRepository } from '../repositories/product.repository.js';
import { Product } from '../models/product.model.js';

const validateProduct = (productData) => {
  try {
    new Product(productData.name, productData.price, productData.stock).validate();
  } catch (error) {
    error.status = 400;
    throw error;
  }
};

export const productService = {
  getAllProducts: async () => productRepository.findAll(),

  getProductById: async (id) => {
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error('Produit non trouvé');
      error.status = 404;
      throw error;
    }
    return product;
  },

  createProduct: async (productData) => {
    validateProduct(productData);
    return productRepository.create({
      name: productData.name.trim(),
      price: productData.price,
      stock: productData.stock
    });
  },

  updateProduct: async (id, productData) => {
    await productService.getProductById(id);
    validateProduct(productData);
    return productRepository.update(id, {
      name: productData.name.trim(),
      price: productData.price,
      stock: productData.stock
    });
  },

  patchProduct: async (id, productData) => {
    const existing = await productService.getProductById(id);
    const updated = { ...existing, ...productData };
    validateProduct(updated);
    return productRepository.update(id, {
      name: updated.name.trim(),
      price: updated.price,
      stock: updated.stock
    });
  },

  deleteProduct: async (id) => {
    await productService.getProductById(id);
    return productRepository.delete(id);
  }
};
