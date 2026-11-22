let products = [
  { id: 1, name: 'Laptop Pro', price: 1200.5, stock: 15 },
  { id: 2, name: 'Souris Sans Fil', price: 25.99, stock: 50 },
  { id: 3, name: 'Clavier Mécanique', price: 75, stock: 30 }
];

export const productRepository = {
  findAll: async () => structuredClone(products),

  findById: async (id) => {
    const product = products.find((item) => item.id === id);
    return product ? structuredClone(product) : undefined;
  },

  create: async (productData) => {
    const newId = products.length > 0
      ? Math.max(...products.map((product) => product.id)) + 1
      : 1;
    const newProduct = { id: newId, ...productData };
    products.push(structuredClone(newProduct));
    return structuredClone(newProduct);
  },

  update: async (id, productData) => {
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) return null;
    products[index] = { ...productData, id };
    return structuredClone(products[index]);
  },

  delete: async (id) => {
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) return false;
    products.splice(index, 1);
    return true;
  },

  reset: async () => {
    products = [
      { id: 1, name: 'Laptop Pro', price: 1200.5, stock: 15 },
      { id: 2, name: 'Souris Sans Fil', price: 25.99, stock: 50 },
      { id: 3, name: 'Clavier Mécanique', price: 75, stock: 30 }
    ];
  }
};
