package com.web.app.Api.DTO;

import com.web.app.Api.Entity.CostEntity;
import com.web.app.Api.Entity.ProductEntity;
import com.web.app.Api.Entity.SpecEntity;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

public record ProductDTO(
        String productName,
        String brand,
        String socketName,
        String family,
        LocalDate releaseDate,
        Boolean isCpu,
        SpecDTO spec,
        CostDTO cost
) {

    public static ProductDTO fromEntity(ProductEntity product) {
        return new ProductDTO(
                product.getProductName(),
                product.getBrand(),
                product.getSocketName(),
                product.getFamily(),
                product.getReleaseDate(),
                product.getCpu(),
                SpecDTO.fromEntity(product.getSpec()),
                CostDTO.fromEntity(product.getCost())
        );
    }
}
