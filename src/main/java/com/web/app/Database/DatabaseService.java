package com.web.app.Database;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.ProductEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DatabaseService  {

    @Autowired
    private DatabaseRepository databaseRepository;

    public List<ProductDTO> getProducts(SearchDTO searchDTO, Pageable page) {
        List<ProductEntity> products = databaseRepository.search(searchDTO, page);

        if (products.isEmpty()) return null;

        return products.stream().map(ProductDTO::fromEntity).toList();
    }

    public ProductDTO getProduct(String name) {
        ProductEntity products = databaseRepository.getProductByName(name);

        if (products == null) return null;

        return ProductDTO.fromEntity(products);
    }

    public List<ProductDTO> getProducts(String prod_name, String prod_compare_name) {
        List<ProductEntity> products = databaseRepository.getProductsByName(new String[]{prod_name, prod_compare_name});

        if (products.isEmpty()) return null;

        return products.stream().map(ProductDTO::fromEntity).toList();
    }

}
