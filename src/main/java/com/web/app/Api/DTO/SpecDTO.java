package com.web.app.Api.DTO;

import com.web.app.Api.Entity.SpecEntity;
import jakarta.persistence.Column;

import java.math.BigDecimal;

public record SpecDTO(
        Short coreCount,
        Short threadCount,
        Boolean hasHyperthread,
        BigDecimal baseClock,
        BigDecimal boostClock,
        Short tdp,
        Short computeRank
) {

    public static SpecDTO fromEntity(SpecEntity spec) {
        return new SpecDTO(
                spec.getCoreCount(),
                spec.getThreadCount(),
                spec.getHasHyperthread(),
                spec.getBaseClock(),
                spec.getBoostClock(),
                spec.getTdp(),
                spec.getComputeRank()
        );
    }
}

