package com.web.app.Api.Entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CpuCategory {

    Unknown("Unknown"),
    Embedded("Embedded/IoT"),
    Laptop("Laptop"),
    Desktop("Desktop"),
    Server("Server/Workstation"),
    Mobile("Mobile / Tablet");

    private final String dbValue;

    /** Aceita o texto da base de dados ("Server/Workstation") ou o nome da constante ("Server"). */
    public static CpuCategory fromDbValue(String value) {
        if (value == null) {
            return null;
        }
        for (CpuCategory candidate : values()) {
            if (candidate.dbValue.equalsIgnoreCase(value) || candidate.name().equalsIgnoreCase(value)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Valor desconhecido para CpuCategory: " + value);
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<CpuCategory, String> {

        @Override
        public String convertToDatabaseColumn(CpuCategory attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public CpuCategory convertToEntityAttribute(String dbData) {
            return fromDbValue(dbData);
        }
    }
}
