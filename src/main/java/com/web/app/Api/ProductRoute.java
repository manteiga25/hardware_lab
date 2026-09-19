package com.web.app.Api;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Database.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.DateTimeException;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Controller
@RequestMapping("/API")
public class ProductRoute {

    @Autowired
    private DatabaseService productService;

    @GetMapping("/product")
    private ResponseEntity<ProductDTO> getProduct(@RequestParam String name) {

        ProductDTO product = productService.getProduct(name);

        if (product == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok(product);
    }

    @GetMapping("/products")
    private ResponseEntity<List<ProductDTO>> getProduct(@RequestParam String name, @RequestParam String compare_name) {

        List<ProductDTO> product = productService.getProducts(name, compare_name);

        if (product == null) return ResponseEntity.notFound().build();
        // A CPU cannot be compared with a GPU. Objects.equals compares the Boolean values, not references.
        if (!Objects.equals(product.getFirst().isCpu(), product.getLast().isCpu())) return ResponseEntity.badRequest().build();

        return ResponseEntity.ok(product);
    }

    @GetMapping("/search")
    private ResponseEntity<List<ProductDTO>> searchProduct(@RequestParam Map<String, Object> queryParams, Pageable page) {
        SearchDTO searchDTO = SearchDTO.fromMap(queryParams);

        List<ProductDTO> products = productService.getProducts(searchDTO, page);

        if (products == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(products);
    }

    // Malformed numbers, dates, booleans or sort keys are client errors, not server errors.
    @ExceptionHandler({IllegalArgumentException.class, DateTimeException.class})
    private ResponseEntity<Void> badRequest() {
        return ResponseEntity.badRequest().build();
    }
}
