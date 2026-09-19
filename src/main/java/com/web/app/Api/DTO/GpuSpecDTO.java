package com.web.app.Api.DTO;

import com.web.app.Api.Entity.FormFactor;
import com.web.app.Api.Entity.GpuSpecEntity;
import com.web.app.Api.Entity.ShaderEra;

import java.math.BigDecimal;

public record GpuSpecDTO(
        FormFactor formFactor,
        String architecture,
        String gpuChip,
        String gpuVariant,
        String foundry,
        Short processSizeNm,
        Integer transistorsMillions,
        Short dieSizeMm2,
        Short baseClock,
        Short boostClock,
        Integer memorySizeMb,
        String memoryType,
        Short memoryBusBit,
        BigDecimal memoryBandwidthGbps,
        Boolean memoryShared,
        Integer shadingUnits,
        Short tmus,
        Short rops,
        Short rtCores,
        Short matrixCores,
        Integer l2CacheKb,
        ShaderEra shaderEra,
        BigDecimal pixelRateGpixelS,
        BigDecimal textureRateGtexelS,
        BigDecimal fp16Gflops,
        BigDecimal fp32Gflops,
        BigDecimal fp64Gflops,
        Short tdp,
        Short suggestedPsu,
        String slotWidth,
        Short lengthMm,
        String powerConnectors,
        String outputs,
        BigDecimal directx,
        BigDecimal opengl,
        String vulkan,
        String cuda,
        String productionStatus,
        Short computeRank
) {

    public static GpuSpecDTO fromEntity(GpuSpecEntity gpuSpec) {
        return gpuSpec == null ? null : new GpuSpecDTO(
                gpuSpec.getFormFactor(),
                gpuSpec.getArchitecture(),
                gpuSpec.getGpuChip(),
                gpuSpec.getGpuVariant(),
                gpuSpec.getFoundry(),
                gpuSpec.getProcessSizeNm(),
                gpuSpec.getTransistorsMillions(),
                gpuSpec.getDieSizeMm2(),
                gpuSpec.getBaseClock(),
                gpuSpec.getBoostClock(),
                gpuSpec.getMemorySizeMb(),
                gpuSpec.getMemoryType(),
                gpuSpec.getMemoryBusBit(),
                gpuSpec.getMemoryBandwidthGbps(),
                gpuSpec.isMemoryShared(),
                gpuSpec.getShadingUnits(),
                gpuSpec.getTmus(),
                gpuSpec.getRops(),
                gpuSpec.getRtCores(),
                gpuSpec.getMatrixCores(),
                gpuSpec.getL2CacheKb(),
                gpuSpec.getShaderEra(),
                gpuSpec.getPixelRateGpixelS(),
                gpuSpec.getTextureRateGtexelS(),
                gpuSpec.getFp16Gflops(),
                gpuSpec.getFp32Gflops(),
                gpuSpec.getFp64Gflops(),
                gpuSpec.getTdp(),
               gpuSpec.getSuggestedPsu(),
                gpuSpec.getSlotWidth(),
                gpuSpec.getLengthMm(),
                gpuSpec.getPowerConnectors(),
                gpuSpec.getOutputs(),
               gpuSpec.getDirectx(),
               gpuSpec.getOpengl(),
               gpuSpec.getVulkan(),
               gpuSpec.getCuda(),
               gpuSpec.getProductionStatus(),
                gpuSpec.getComputeRank()
        );
    }

}
