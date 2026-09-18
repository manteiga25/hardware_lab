package com.web.app.Api.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record SearchDTO (String productName,
                         String brand,
                         String socketName,
                         String family,

                         Integer minCoreCount,
                         Integer maxCoreCount,

                         Integer minThreadCount,
                         Integer maxThreadCount,

                         Boolean hasHyperthread,

                         BigDecimal minBaseClock,
                         BigDecimal maxBaseClock,

                         BigDecimal minBoostClock,
                         BigDecimal maxBoostClock,

                         Integer minTdp,
                         Integer maxTdp,

                         Integer minComputeRank,
                         Integer maxComputeRank,

                         BigDecimal minCost,
                         BigDecimal maxCost,

                         LocalDate minReleaseDate,
                         LocalDate maxReleaseDate,

                         Boolean isCpu) {

    public static SearchDTO fromMap(Map<String, Object> map) {

        String productName = (String) map.get("name");
        String brand = (String) map.get("brand");
        String socketName = (String) map.get("socketName");
        String family = (String) map.get("family");

        Integer minCoreCount = (Integer) map.get("minCoreCount");
        Integer maxCoreCount = (Integer) map.get("maxCoreCount");

        Integer minThreadCount = (Integer) map.get("minThreadCount");
        Integer maxThreadCount = (Integer) map.get("maxThreadCount");

        Boolean hasHyperthread = (Boolean) map.get("hasHyperthread");

        BigDecimal minBaseClock = toBigDecimal(map.get("minBaseClock"));
        BigDecimal maxBaseClock = toBigDecimal(map.get("maxBaseClock"));

        BigDecimal minBoostClock = toBigDecimal(map.get("minBoostClock"));
        BigDecimal maxBoostClock = toBigDecimal(map.get("maxBoostClock"));

        Integer minTdp = (Integer) map.get("minTdp");
        Integer maxTdp = (Integer) map.get("maxTdp");

        Integer minComputeRank = (Integer) map.get("minComputeRank");
        Integer maxComputeRank = (Integer) map.get("maxComputeRank");

        BigDecimal minCost = toBigDecimal(map.get("minCost"));
        BigDecimal maxCost = toBigDecimal(map.get("maxCost"));

        LocalDate minReleaseDate = toLocalDate(map.get("minReleaseDate"));
        LocalDate maxReleaseDate = toLocalDate(map.get("maxReleaseDate"));

        Boolean isCpu = (Boolean) map.get("isCpu");

        return new SearchDTO(
                productName,
                brand,
                socketName,
                family,

                minCoreCount,
                maxCoreCount,

                minThreadCount,
                maxThreadCount,

                hasHyperthread,

                minBaseClock,
                maxBaseClock,

                minBoostClock,
                maxBoostClock,

                minTdp,
                maxTdp,

                minComputeRank,
                maxComputeRank,

                minCost,
                maxCost,

                minReleaseDate,
                maxReleaseDate,

                isCpu
        );
    }

    private static BigDecimal toBigDecimal(Object value) {
        return switch (value) {
            case null -> null;
            case BigDecimal bd -> bd;
            case Number number -> BigDecimal.valueOf(number.doubleValue());
            default -> new BigDecimal(value.toString());
        };

    }

    private static LocalDate toLocalDate(Object value) {
        return switch (value) {
            case null -> null;
            case LocalDate date -> date;
            default -> LocalDate.parse(value.toString());
        };
    }
}
