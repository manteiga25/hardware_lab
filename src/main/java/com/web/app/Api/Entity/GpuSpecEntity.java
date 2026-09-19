package com.web.app.Api.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "gpuspec")
@Getter
@Setter
public class GpuSpecEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "form_factor", nullable = false, length = 10)
    private FormFactor formFactor;

    @Column(name = "architecture", length = 40)
    private String architecture;

    @Column(name = "gpu_chip", length = 40)
    private String gpuChip;

    @Column(name = "gpu_variant", length = 60)
    private String gpuVariant;

    @Column(name = "foundry", length = 20)
    private String foundry;

    @Column(name = "process_size_nm")
    private Short processSizeNm;

    @Column(name = "transistors_millions")
    private Integer transistorsMillions;

    @Column(name = "die_size_mm2")
    private Short dieSizeMm2;

    @Column(name = "base_clock")
    private Short baseClock;

    @Column(name = "boost_clock")
    private Short boostClock;

    @Column(name = "memory_size_mb")
    private Integer memorySizeMb;

    @Column(name = "memory_type", length = 15)
    private String memoryType;

    @Column(name = "memory_bus_bit")
    private Short memoryBusBit;

    @Column(name = "memory_bandwidth_gbps", precision = 9, scale = 2)
    private BigDecimal memoryBandwidthGbps;

    @Column(name = "memory_shared", nullable = false)
    private boolean memoryShared;

    @Column(name = "shading_units")
    private Integer shadingUnits;

    @Column(name = "tmus")
    private Short tmus;

    @Column(name = "rops")
    private Short rops;

    @Column(name = "rt_cores")
    private Short rtCores;

    @Column(name = "matrix_cores")
    private Short matrixCores;

    @Column(name = "l2_cache_kb")
    private Integer l2CacheKb;

    @Column(name = "shader_era", length = 15)
    private ShaderEra shaderEra;

    @Column(name = "pixel_rate_gpixel_s", precision = 8, scale = 2)
    private BigDecimal pixelRateGpixelS;

    @Column(name = "texture_rate_gtexel_s", precision = 8, scale = 2)
    private BigDecimal textureRateGtexelS;

    @Column(name = "fp16_gflops", precision = 10, scale = 2)
    private BigDecimal fp16Gflops;

    @Column(name = "fp32_gflops", precision = 10, scale = 2)
    private BigDecimal fp32Gflops;

    @Column(name = "fp64_gflops", precision = 10, scale = 2)
    private BigDecimal fp64Gflops;

    @Column(name = "tdp")
    private Short tdp;

    @Column(name = "suggested_psu")
    private Short suggestedPsu;

    @Column(name = "slot_width", length = 15)
    private String slotWidth;

    @Column(name = "length_mm")
    private Short lengthMm;

    @Column(name = "power_connectors", length = 40)
    private String powerConnectors;

    @Column(name = "outputs", length = 60)
    private String outputs;

    @Column(name = "directx", precision = 3, scale = 1)
    private BigDecimal directx;

    @Column(name = "opengl", precision = 3, scale = 1)
    private BigDecimal opengl;

    @Column(name = "vulkan", length = 10)
    private String vulkan;

    @Column(name = "cuda", length = 10)
    private String cuda;

    @Column(name = "production_status", length = 15)
    private String productionStatus;

    @Column(name = "compute_rank", nullable = false)
    private short computeRank;

}
