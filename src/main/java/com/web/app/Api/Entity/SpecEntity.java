package com.web.app.Api.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@Table(name = "Spec")
public class SpecEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "core_count", nullable = false)
    private Short coreCount;

    @Column(name = "thread_count", nullable = false)
    private Short threadCount;

    @Column(name = "has_hyperthread", nullable = false)
    private Boolean hasHyperthread;

    @Column(name = "base_clock", precision = 4, scale = 2, nullable = false)
    private BigDecimal baseClock;

    @Column(name = "boost_clock", precision = 4, scale = 2)
    private BigDecimal boostClock = BigDecimal.ZERO;

    @Column(name = "tdp")
    private Short tdp = 0;

    @Column(name = "compute_rank", nullable = false, unique = true)
    private Short computeRank;

    public Integer getId() {
        return id;
    }

    public Short getCoreCount() {
        return coreCount;
    }

    public Short getThreadCount() {
        return threadCount;
    }

    public Boolean getHasHyperthread() {
        return hasHyperthread;
    }

    public BigDecimal getBaseClock() {
        return baseClock;
    }

    public BigDecimal getBoostClock() {
        return boostClock;
    }

    public Short getTdp() {
        return tdp;
    }

    public Short getComputeRank() {
        return computeRank;
    }
}
