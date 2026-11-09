package com.example.productapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ProductApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createsAndReadsAProduct() throws Exception {
        String name = "Laptop-" + UUID.randomUUID();
        MvcResult result = mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(name, "Laptop de test", "1200.50", 10)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.name").value(name))
                .andReturn();

        JsonNode product = objectMapper.readTree(result.getResponse().getContentAsString());
        mockMvc.perform(get("/api/products/{id}", product.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(product.get("id").asLong()))
                .andExpect(jsonPath("$.price").value(1200.50));
    }

    @Test
    void searchesProductsWithoutCaseSensitivity() throws Exception {
        String name = "Search-" + UUID.randomUUID();
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(name, "Produit de recherche", "12.00", 1)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/products/search").param("name", name.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value(name));
    }

    @Test
    void returnsAnEmptyListForBlankSearch() throws Exception {
        mockMvc.perform(get("/api/products/search").param("name", "   "))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void updatesAndDeletesAProduct() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("Produit modifiable", "Avant", "20.00", 3)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/products/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("Produit modifié", "Après", "25.00", 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Produit modifié"))
                .andExpect(jsonPath("$.price").value(25.00));

        mockMvc.perform(delete("/api/products/{id}", id))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/products/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString(Long.toString(id))));
    }

    @Test
    void rejectsInvalidFieldsAndQuantityAboveLimit() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":" ","price":-1,"quantity":-1}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists())
                .andExpect(jsonPath("$.fields.price").exists())
                .andExpect(jsonPath("$.fields.quantity").exists());

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("Trop de stock", "Limite dépassée", "1.00", 1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La quantité ne peut pas dépasser 1000"));
    }

    @Test
    void returnsNotFoundForUnknownProduct() throws Exception {
        mockMvc.perform(get("/api/products/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    private String productJson(String name, String description, String price, int quantity) throws Exception {
        return objectMapper.writeValueAsString(new ProductPayload(
                name,
                description,
                new BigDecimal(price),
                quantity
        ));
    }

    private record ProductPayload(String name, String description, BigDecimal price, Integer quantity) {
    }
}
