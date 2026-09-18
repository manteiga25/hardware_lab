package com.web.app.Database;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.ProductEntity;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CustomRepository {
    List<ProductEntity> getProductsByName(String[] name);

    List<ProductEntity> search(SearchDTO query, Pageable page);
    ProductEntity getProductByName(String name);

}
