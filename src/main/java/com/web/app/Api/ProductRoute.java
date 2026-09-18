package com.web.app.Api;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Database.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/search")
    private ResponseEntity<List<ProductDTO>> searchProduct(@RequestParam Map<String, Object> queryParams) {
        SearchDTO searchDTO = SearchDTO.fromMap(queryParams);

        List<ProductDTO> products = productService.getProducts(searchDTO);

        if (products == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(products);
    }


}
