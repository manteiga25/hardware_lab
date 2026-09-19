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
public enum FormFactor {

    DESKTOP("desktop"),
    MOBILE("mobile"),
    INTEGRATED("integrated");

    private final String dbValue;

    public static FormFactor fromDbValue(String value) {
        if (value == null) {
            return null;
        }
        for (FormFactor candidate : values()) {
            if (candidate.dbValue.equalsIgnoreCase(value)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Valor desconhecido para FormFactor: " + value);
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<FormFactor, String> {

        @Override
        public String convertToDatabaseColumn(FormFactor attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public FormFactor convertToEntityAttribute(String dbData) {
            return fromDbValue(dbData);
        }
    }
}