package com.web.app.Api.Entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Precisao da data de lancamento: algumas placas graficas so tem o ano ou o mes conhecidos,
 * e a data guardada nesses casos e o primeiro dia do periodo.
 */
@Getter
@AllArgsConstructor
public enum DatePrecision {

    DAY("day"),
    MONTH("month"),
    YEAR("year");

    private final String dbValue;

    public static DatePrecision fromDbValue(String value) {
        if (value == null) {
            return null;
        }
        for (DatePrecision candidate : values()) {
            if (candidate.dbValue.equalsIgnoreCase(value)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Valor desconhecido para DatePrecision: " + value);
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<DatePrecision, String> {

        @Override
        public String convertToDatabaseColumn(DatePrecision attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public DatePrecision convertToEntityAttribute(String dbData) {
            return fromDbValue(dbData);
        }
    }
}
