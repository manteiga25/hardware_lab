package com.web.app.Database;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.ProductEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DatabaseService  {

    @Autowired
    private RepositoryImp databaseRepository;

    public List<ProductDTO> getProducts(SearchDTO searchDTO, Pageable page) {
        List<ProductEntity> products = databaseRepository.search(searchDTO, page);

        if (products.isEmpty()) return null;

        return products.stream().map(ProductDTO::fromEntity).toList();
    }

    public ProductDTO getProduct(String name) {
        Optional<ProductEntity> product = databaseRepository.findByProductName(name);

        return product.map(ProductDTO::fromEntity).orElse(null);

    }

    public List<ProductDTO> getCompare(String prod_name, String prod_compare_name) {
        List<ProductEntity> products = databaseRepository.findByProductNameIn(new String[]{prod_name, prod_compare_name});

        if (products.isEmpty()) return null;

        return products.stream().map(ProductDTO::fromEntity).toList();
    }

    public List<ProductDTO> getProducts(List<String> names) {
        List<ProductEntity> products = databaseRepository.findByProductNameIn(names.toArray(new String[0]));

        if (products.isEmpty()) return null;

        return products.stream().map(ProductDTO::fromEntity).toList();
    }

}
