package com.example.productapi.service;

import com.example.productapi.dto.ProductRequest;
import com.example.productapi.dto.ProductResponse;
import com.example.productapi.exception.InvalidQuantityException;
import com.example.productapi.exception.ResourceNotFoundException;
import com.example.productapi.model.Product;
import com.example.productapi.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private static final int MAX_QUANTITY = 1000;

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public ProductResponse createProduct(ProductRequest request) {
        validateQuantity(request.quantity());
        return toResponse(repository.save(toProduct(null, request)));
    }

    public List<ProductResponse> getAllProducts() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductResponse getProductById(Long id) {
        return toResponse(findProduct(id));
    }

    public List<ProductResponse> searchByName(String name) {
        String query = name.trim();
        if (query.isEmpty()) {
            return List.of();
        }
        return repository.findByNameContainingIgnoreCase(query).stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductResponse updateProduct(Long id, ProductRequest request) {
        validateQuantity(request.quantity());
        findProduct(id);
        return toResponse(repository.save(toProduct(id, request)));
    }

    public void deleteProduct(Long id) {
        findProduct(id);
        repository.deleteById(id);
    }

    private Product findProduct(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produit introuvable avec l'id : " + id));
    }

    private void validateQuantity(Integer quantity) {
        if (quantity > MAX_QUANTITY) {
            throw new InvalidQuantityException("La quantité ne peut pas dépasser " + MAX_QUANTITY);
        }
    }

    private Product toProduct(Long id, ProductRequest request) {
        return new Product(id, request.name().trim(), request.description(), request.price(), request.quantity());
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.id(),
                product.name(),
                product.description(),
                product.price(),
                product.quantity()
        );
    }
}
