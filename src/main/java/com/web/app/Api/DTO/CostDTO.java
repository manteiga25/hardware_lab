package com.web.app.Api.DTO;

import com.web.app.Api.Entity.CostEntity;

import java.math.BigDecimal;

public record CostDTO(
        BigDecimal cost,
        BigDecimal costPerCore,
        BigDecimal costPerRankPoint
) {

    public static CostDTO fromEntity(CostEntity cost) {
        return new CostDTO(
                cost.getCost(),
                cost.getCostPerCore(),
                cost.getCostPerRankPoint()
        );
    }
}

