package com.web.app.Api.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@Table(name = "Cost")
public class CostEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(precision = 8, scale = 2)
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(name = "cost_per_core", precision = 8, scale = 2)
    private BigDecimal costPerCore = BigDecimal.ZERO;

    @Column(name = "cost_per_rank_point", precision = 8, scale = 2)
    private BigDecimal costPerRankPoint = BigDecimal.ZERO;
}
