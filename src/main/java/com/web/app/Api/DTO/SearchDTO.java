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

        // Query parameters always arrive as Strings, so every value is parsed explicitly.
        // Invalid values throw IllegalArgumentException, which the controller maps to 400.
        String productName = toText(map.get("name"));
        String brand = toText(map.get("brand"));
        String socketName = toText(map.get("socketName"));
        String family = toText(map.get("family"));

        Integer minCoreCount = toInteger(map.get("minCoreCount"));
        Integer maxCoreCount = toInteger(map.get("maxCoreCount"));

        Integer minThreadCount = toInteger(map.get("minThreadCount"));
        Integer maxThreadCount = toInteger(map.get("maxThreadCount"));

        Boolean hasHyperthread = toBoolean(map.get("hasHyperthread"));

        BigDecimal minBaseClock = toBigDecimal(map.get("minBaseClock"));
        BigDecimal maxBaseClock = toBigDecimal(map.get("maxBaseClock"));

        BigDecimal minBoostClock = toBigDecimal(map.get("minBoostClock"));
        BigDecimal maxBoostClock = toBigDecimal(map.get("maxBoostClock"));

        Integer minTdp = toInteger(map.get("minTdp"));
        Integer maxTdp = toInteger(map.get("maxTdp"));

        Integer minComputeRank = toInteger(map.get("minComputeRank"));
        Integer maxComputeRank = toInteger(map.get("maxComputeRank"));

        BigDecimal minCost = toBigDecimal(map.get("minCost"));
        BigDecimal maxCost = toBigDecimal(map.get("maxCost"));

        LocalDate minReleaseDate = toLocalDate(map.get("minReleaseDate"));
        LocalDate maxReleaseDate = toLocalDate(map.get("maxReleaseDate"));

        Boolean isCpu = toBoolean(map.get("isCpu"));

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

    private static String toText(Object value) {
        if (value == null || value.toString().isBlank()) return null;
        return value.toString().trim();
    }

    private static Integer toInteger(Object value) {
        return switch (value) {
            case null -> null;
            case Integer integer -> integer;
            case Number number -> number.intValue();
            default -> {
                String text = toText(value);
                yield text == null ? null : Integer.valueOf(text);
            }
        };
    }

    private static Boolean toBoolean(Object value) {
        return switch (value) {
            case null -> null;
            case Boolean bool -> bool;
            default -> {
                String text = toText(value);
                if (text == null) yield null;
                if (text.equalsIgnoreCase("true")) yield true;
                if (text.equalsIgnoreCase("false")) yield false;
                throw new IllegalArgumentException("Invalid boolean: " + text);
            }
        };
    }

    private static BigDecimal toBigDecimal(Object value) {
        return switch (value) {
            case null -> null;
            case BigDecimal bd -> bd;
            case Number number -> BigDecimal.valueOf(number.doubleValue());
            default -> {
                String text = toText(value);
                yield text == null ? null : new BigDecimal(text);
            }
        };

    }

    private static LocalDate toLocalDate(Object value) {
        return switch (value) {
            case null -> null;
            case LocalDate date -> date;
            default -> {
                String text = toText(value);
                yield text == null ? null : LocalDate.parse(text);
            }
        };
    }
}
