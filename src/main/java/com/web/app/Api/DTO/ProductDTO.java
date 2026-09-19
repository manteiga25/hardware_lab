package com.web.app.Api.DTO;

import com.web.app.Api.Entity.DatePrecision;
import com.web.app.Api.Entity.ProductEntity;

import java.time.LocalDate;

public record ProductDTO(
        String productName,
        String brand,
        String socketName,
        String family,
        LocalDate releaseDate,
        DatePrecision releaseDatePrecision,
        Boolean isCpu,
        SpecDTO spec,
        CostDTO cost,
        GpuSpecDTO gpuSpec
) {

    public static ProductDTO fromEntity(ProductEntity product) {
        return new ProductDTO(
                product.getProductName(),
                product.getBrand(),
                product.getSocketName(),
                product.getFamily(),
                product.getReleaseDate(),
                product.getReleaseDatePrecision(),
                product.getIsCpu(),
                SpecDTO.fromEntity(product.getSpec()),
                CostDTO.fromEntity(product.getCost()),
                GpuSpecDTO.fromEntity(product.getGpuSpec())
        );
    }
}
