package com.web.app.Database;

import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.CostEntity;
import com.web.app.Api.Entity.GpuSpecEntity;
import com.web.app.Api.Entity.ProductEntity;
import com.web.app.Api.Entity.SpecEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
public class CustomRepositoryImpl implements CustomRepository {

    private static final char LIKE_ESCAPE = '!';

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<ProductEntity> search(SearchDTO query, Pageable page) {

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        CriteriaQuery<ProductEntity> cq = cb.createQuery(ProductEntity.class);

        Root<ProductEntity> product = cq.from(ProductEntity.class);

        // A product has either CPU specs or GPU specs, so both joins are optional.
        Join<ProductEntity, SpecEntity> spec =
                product.join("spec", JoinType.LEFT);

        Join<ProductEntity, GpuSpecEntity> gpu =
                product.join("gpuSpec", JoinType.LEFT);

        Join<ProductEntity, CostEntity> cost =
                product.join("cost");

        Boolean isCpu = query.isCpu();

        List<Predicate> predicates =
                new ArrayList<>();

        // Product
        if (query.productName() != null) {
            predicates.add(nameMatches(cb, query.productName(), product, gpu));
        }

        if (query.brand() != null) {
            predicates.add(cb.equal(product.get("brand"), query.brand()));
        }

        if (query.socketName() != null) {
            predicates.add(cb.equal(product.get("socketName"), query.socketName()));
        }

        if (query.family() != null) {
            predicates.add(cb.equal(product.get("family"), query.family()));
        }

        if (isCpu != null) {
            predicates.add(cb.equal(product.get("isCpu"), isCpu));
        }

        addRange(cb, predicates, product.<LocalDate>get("releaseDate"),
                query.minReleaseDate(), query.maxReleaseDate());

        // Shared by CPUs and GPUs, stored in the table of each type
        addRange(cb, predicates, byType(cb, isCpu, spec.<Short>get("tdp"), gpu.<Short>get("tdp")),
                toShort(query.minTdp()), toShort(query.maxTdp()));

        addRange(cb, predicates, byType(cb, isCpu, spec.<Short>get("computeRank"), gpu.<Short>get("computeRank")),
                toShort(query.minComputeRank()), toShort(query.maxComputeRank()));

        // CPU only
        addRange(cb, predicates, spec.<Short>get("coreCount"),
                toShort(query.minCoreCount()), toShort(query.maxCoreCount()));

        addRange(cb, predicates, spec.<Short>get("threadCount"),
                toShort(query.minThreadCount()), toShort(query.maxThreadCount()));

        if (query.hasHyperthread() != null) {
            predicates.add(cb.equal(spec.get("hasHyperthread"), query.hasHyperthread()));
        }

        if (query.category() != null) {
            predicates.add(cb.equal(spec.get("category"), query.category()));
        }

        addRange(cb, predicates, spec.<BigDecimal>get("baseClock"),
                query.minBaseClock(), query.maxBaseClock());

        addRange(cb, predicates, spec.<BigDecimal>get("boostClock"),
                query.minBoostClock(), query.maxBoostClock());

        // GPU only
        if (query.formFactor() != null) {
            predicates.add(cb.equal(gpu.get("formFactor"), query.formFactor()));
        }

        addRange(cb, predicates, gpu.<Integer>get("memorySizeMb"),
                query.minMemoryMb(), null);

        if (query.hasRayTracing() != null) {
            Path<Short> rtCores = gpu.get("rtCores");
            predicates.add(query.hasRayTracing()
                    ? cb.greaterThan(rtCores, (short) 0)
                    : cb.or(cb.isNull(rtCores), cb.equal(rtCores, (short) 0)));
        }

        // Cost
        addRange(cb, predicates, cost.<BigDecimal>get("cost"),
                query.minCost(), query.maxCost());

        cq.select(product)
                .where(predicates.toArray(new Predicate[0]))
                .orderBy(toOrders(cb, page.getSort(), isCpu, product, spec, gpu, cost));

        return entityManager
                .createQuery(cq)
                .setMaxResults(page.getPageSize())
                .setFirstResult((int) page.getOffset())
                .getResultList();
    }

    // Every word must appear in the name, brand or family, or in the GPU chip or architecture,
    // in any order: "nvidia 4060" and "ryzen 5600x" both work. Names are also compared without
    // spaces and hyphens, so "rtx4060" finds "GeForce RTX 4060" and "i512600k" finds "Core i5-12600K".
    private Predicate nameMatches(CriteriaBuilder cb, String text, Root<ProductEntity> product,
                                  Join<ProductEntity, GpuSpecEntity> gpu) {

        Expression<String> name = cb.lower(product.get("productName"));
        Expression<String> compactName = cb.replace(cb.replace(name, " ", ""), "-", "");

        List<Predicate> words = new ArrayList<>();

        for (String word : text.toLowerCase().split("\\s+")) {
            if (word.isEmpty()) continue;

            String pattern = contains(word);

            words.add(cb.or(
                    cb.like(name, pattern, LIKE_ESCAPE),
                    cb.like(compactName, contains(word.replace("-", "")), LIKE_ESCAPE),
                    cb.like(cb.lower(product.get("brand")), pattern, LIKE_ESCAPE),
                    cb.like(cb.lower(product.get("family")), pattern, LIKE_ESCAPE),
                    cb.like(cb.lower(gpu.get("gpuChip")), pattern, LIKE_ESCAPE),
                    cb.like(cb.lower(gpu.get("architecture")), pattern, LIKE_ESCAPE)
            ));
        }

        return cb.and(words.toArray(new Predicate[0]));
    }

    // Only these sort keys are accepted from the request; anything else is rejected with 400.
    // Unknown values (NULL) always go last, whatever the direction.
    private List<Order> toOrders(CriteriaBuilder cb, Sort sort, Boolean isCpu, Root<ProductEntity> product,
                                 Join<ProductEntity, SpecEntity> spec, Join<ProductEntity, GpuSpecEntity> gpu,
                                 Join<ProductEntity, CostEntity> cost) {

        boolean gpuOnly = Boolean.FALSE.equals(isCpu);
        List<Order> orders = new ArrayList<>();

        for (Sort.Order sortOrder : sort) {
            Expression<?> expression = switch (sortOrder.getProperty()) {
                // CPUs: ranking position, 1 is the fastest. GPUs: score from 0 to 1000, 1000 is the fastest.
                case "rank" -> byType(cb, isCpu, spec.<Short>get("computeRank"), gpu.<Short>get("computeRank"));
                case "cores" -> gpuOnly ? gpu.get("shadingUnits") : spec.get("coreCount");
                case "threads" -> spec.get("threadCount");
                case "boostClock" -> gpuOnly ? gpu.get("boostClock") : spec.get("boostClock");
                case "memory" -> gpu.get("memorySizeMb");
                case "tdp" -> byType(cb, isCpu, spec.<Short>get("tdp"), gpu.<Short>get("tdp"));
                case "cost" -> cost.get("cost");
                case "value" -> costPerIndexPoint(cb, isCpu, spec, gpu, cost);
                case "releaseDate" -> product.get("releaseDate");
                case "name" -> product.get("productName");
                default -> throw new IllegalArgumentException("Unsupported sort property: " + sortOrder.getProperty());
            };

            orders.add(sortOrder.isAscending()
                    ? cb.asc(expression, Nulls.LAST)
                    : cb.desc(expression, Nulls.LAST));
        }

        // Deterministic tie-breakers (fastest first) so consecutive pages never repeat or skip products.
        orders.add(cb.asc(spec.get("computeRank"), Nulls.LAST));
        orders.add(cb.desc(gpu.get("computeRank"), Nulls.LAST));
        orders.add(cb.asc(product.get("productName")));

        return orders;
    }

    // Price per point of the 0-100 performance index, the same "custo por ponto" the front-end shows:
    //   CPU index = 100 * (maxRank + 1 - rank) / maxRank
    //   GPU index = score / 10 (a score of 0 means "not scored", so there is no index)
    // Sorting ascending lists the best value first; products without an index get NULL and go last.
    private Expression<?> costPerIndexPoint(CriteriaBuilder cb, Boolean isCpu, Join<ProductEntity, SpecEntity> spec,
                                            Join<ProductEntity, GpuSpecEntity> gpu, Join<ProductEntity, CostEntity> cost) {

        Short maxRank = entityManager
                .createQuery("select max(s.computeRank) from SpecEntity s", Short.class)
                .getSingleResult();

        Expression<Number> cpuIndex = maxRank == null ? null : cb.<Number>prod(
                cb.<Number>diff(cb.literal(maxRank + 1), spec.<Short>get("computeRank")),
                cb.literal(100.0 / maxRank));

        Expression<Number> gpuIndex = cb.quot(
                cb.nullif(gpu.<Short>get("computeRank"), (short) 0),
                cb.literal(10.0));

        return cb.quot(cost.<BigDecimal>get("cost"), byType(cb, isCpu, cpuIndex, gpuIndex));
    }

    // CPU and GPU numbers live in different tables. With the type known, use that column;
    // otherwise take whichever one the product has.
    @SuppressWarnings("unchecked")
    private static <T> Expression<T> byType(CriteriaBuilder cb, Boolean isCpu,
                                            Expression<? extends T> cpu, Expression<? extends T> gpu) {
        if (cpu == null || Boolean.FALSE.equals(isCpu)) return (Expression<T>) gpu;
        if (Boolean.TRUE.equals(isCpu)) return (Expression<T>) cpu;
        return cb.coalesce(cpu, gpu);
    }

    private static <T extends Comparable<? super T>> void addRange(CriteriaBuilder cb, List<Predicate> predicates,
                                                                   Expression<? extends T> path, T min, T max) {
        if (min != null) predicates.add(cb.greaterThanOrEqualTo(path, min));
        if (max != null) predicates.add(cb.lessThanOrEqualTo(path, max));
    }

    private static Short toShort(Integer value) {
        if (value == null) return null;

        if (value < Short.MIN_VALUE || value > Short.MAX_VALUE) {
            throw new IllegalArgumentException("Value out of range: " + value);
        }

        return value.shortValue();
    }

    private static String contains(String text) {
        return "%" + escapeLike(text) + "%";
    }

    // User input must not act as a LIKE wildcard ("%" or "_").
    private static String escapeLike(String text) {
        return text
                .replace(String.valueOf(LIKE_ESCAPE), "" + LIKE_ESCAPE + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }

}
