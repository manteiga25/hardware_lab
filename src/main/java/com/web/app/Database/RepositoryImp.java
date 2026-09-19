package com.web.app.Database;


import com.web.app.Api.Entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepositoryImp extends JpaRepository<ProductEntity, Long>, CustomRepository {
    Optional<ProductEntity> findByProductName(String name);
    List<ProductEntity> findByProductNameIn(String[] names);
}
