package com.web.app.Api.Entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Conjunto fechado de valores. O texto guardado na base de dados nao coincide
 * com o nome da constante, por isso a conversao e explicita em vez de
 * {@code @Enumerated(EnumType.STRING)}.
 */
@Getter
@AllArgsConstructor
public enum ShaderEra {

    FIXED_FUNCTION("fixed-function"),
    UNIFIED("unified");

    private final String dbValue;

    public static ShaderEra fromDbValue(String value) {
        if (value == null) {
            return null;
        }
        for (ShaderEra candidate : values()) {
            if (candidate.dbValue.equalsIgnoreCase(value)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Valor desconhecido para ShaderEra: " + value);
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<ShaderEra, String> {

        @Override
        public String convertToDatabaseColumn(ShaderEra attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public ShaderEra convertToEntityAttribute(String dbData) {
            return fromDbValue(dbData);
        }
    }
}