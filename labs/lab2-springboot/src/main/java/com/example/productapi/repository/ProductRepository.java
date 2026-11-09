package com.example.productapi.repository;

import com.example.productapi.model.Product;
import org.springframework.stereotype.Repository;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class ProductRepository {

    private final ConcurrentMap<Long, Product> products = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public Product save(Product product) {
        Long id = product.id() == null ? idGenerator.getAndIncrement() : product.id();
        Product saved = new Product(id, product.name(), product.description(), product.price(), product.quantity());
        products.put(id, saved);
        return saved;
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(products.get(id));
    }

    public List<Product> findAll() {
        return products.values().stream()
                .sorted(Comparator.comparing(Product::id))
                .toList();
    }

    public List<Product> findByNameContainingIgnoreCase(String name) {
        String normalizedName = name.toLowerCase();
        return findAll().stream()
                .filter(product -> product.name().toLowerCase().contains(normalizedName))
                .toList();
    }

    public void deleteById(Long id) {
        products.remove(id);
    }
}
