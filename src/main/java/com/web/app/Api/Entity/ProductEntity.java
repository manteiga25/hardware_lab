package com.web.app.Api.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "Product")
@Getter
@Setter
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "product_name", length = 50, nullable = false, unique = true)
    private String productName;

    @Column(length = 30, nullable = false)
    private String brand;

    @Column(name = "socket_name", length = 30)
    private String socketName = "Unknown";

    @Column(length = 30)
    private String family;

    @Column(name = "release_date", nullable = false)
    private LocalDate releaseDate;

    @Column(name = "release_date_precision", nullable = false)
    private DatePrecision releaseDatePrecision;

    @OneToOne
    @JoinColumn(name = "spec", nullable = false, unique = true)
    private SpecEntity spec;

    @OneToOne
    @JoinColumn(name = "cost", nullable = false, unique = true)
    private CostEntity cost;

    @Column(name = "is_cpu", nullable = false)
    private Boolean isCpu;

    @OneToOne
    @JoinColumn(name = "gpu_spec", unique = true)
    private GpuSpecEntity gpuSpec;
}
