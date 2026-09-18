package com.web.app.Database;

import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.CostEntity;
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
public class DatabaseRepository implements CustomRepository {

    private static final char LIKE_ESCAPE = '!';

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public ProductEntity getProductByName(String name) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<ProductEntity> cq = cb.createQuery(ProductEntity.class);
        Root<ProductEntity> product = cq.from(ProductEntity.class);
        cq.select(product).where(cb.equal(product.get("productName"), name));
        return entityManager.createQuery(cq).getSingleResultOrNull();
    }

    @Override
    public List<ProductEntity> getProductsByName(String[] name) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<ProductEntity> cq = cb.createQuery(ProductEntity.class);
        Root<ProductEntity> product = cq.from(ProductEntity.class);
        cq.select(product).where(product.get("productName").in((Object[]) name));
        return entityManager.createQuery(cq).getResultList();
    }

    @Override
    public List<ProductEntity> search(SearchDTO query, Pageable page) {

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        CriteriaQuery<ProductEntity> cq = cb.createQuery(ProductEntity.class);

        Root<ProductEntity> product = cq.from(ProductEntity.class);

        Join<ProductEntity, SpecEntity> spec =
                product.join("spec");

        Join<ProductEntity, CostEntity> cost =
                product.join("cost");

        List<Predicate> predicates =
                new ArrayList<>();

        // Product
        if (query.productName() != null) {

            predicates.add(
                    cb.like(
                            cb.lower(product.get("productName")),
                            "%" +
                                    escapeLike(query.productName().toLowerCase()) +
                                    "%",
                            LIKE_ESCAPE
                    )
            );
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

        if (query.isCpu() != null) {
            predicates.add(cb.equal(product.get("isCpu"), query.isCpu()));
        }

        addRange(cb, predicates, product.<LocalDate>get("releaseDate"),
                query.minReleaseDate(), query.maxReleaseDate());

        // Spec
        addRange(cb, predicates, spec.<Short>get("coreCount"),
                toShort(query.minCoreCount()), toShort(query.maxCoreCount()));

        addRange(cb, predicates, spec.<Short>get("threadCount"),
                toShort(query.minThreadCount()), toShort(query.maxThreadCount()));

        if (query.hasHyperthread() != null) {
            predicates.add(cb.equal(spec.get("hasHyperthread"), query.hasHyperthread()));
        }

        addRange(cb, predicates, spec.<BigDecimal>get("baseClock"),
                query.minBaseClock(), query.maxBaseClock());

        addRange(cb, predicates, spec.<BigDecimal>get("boostClock"),
                query.minBoostClock(), query.maxBoostClock());

        addRange(cb, predicates, spec.<Short>get("tdp"),
                toShort(query.minTdp()), toShort(query.maxTdp()));

        addRange(cb, predicates, spec.<Short>get("computeRank"),
                toShort(query.minComputeRank()), toShort(query.maxComputeRank()));

        // Cost
        addRange(cb, predicates, cost.<BigDecimal>get("cost"),
                query.minCost(), query.maxCost());

        cq.select(product)
                .where(predicates.toArray(new Predicate[0]))
                .orderBy(toOrders(cb, page.getSort(), product, spec, cost));

        return entityManager
                .createQuery(cq)
                .setMaxResults(page.getPageSize())
                .setFirstResult((int) page.getOffset())
                .getResultList();
    }

    // Only these sort keys are accepted from the request; anything else is rejected with 400.
    private List<Order> toOrders(CriteriaBuilder cb, Sort sort, Root<ProductEntity> product,
                                 Join<ProductEntity, SpecEntity> spec, Join<ProductEntity, CostEntity> cost) {

        List<Order> orders = new ArrayList<>();

        for (Sort.Order sortOrder : sort) {
            Expression<?> expression = switch (sortOrder.getProperty()) {
                case "rank" -> spec.get("computeRank");
                case "cores" -> spec.get("coreCount");
                case "threads" -> spec.get("threadCount");
                case "boostClock" -> spec.get("boostClock");
                case "tdp" -> spec.get("tdp");
                case "cost" -> cost.get("cost");
                case "value" -> costPerPerformancePoint(cb, spec, cost);
                case "releaseDate" -> product.get("releaseDate");
                case "name" -> product.get("productName");
                default -> throw new IllegalArgumentException("Unsupported sort property: " + sortOrder.getProperty());
            };

            orders.add(sortOrder.isAscending() ? cb.asc(expression) : cb.desc(expression));
        }

        // Deterministic tie-breakers so consecutive pages never repeat or skip products.
        orders.add(cb.asc(spec.get("computeRank")));
        orders.add(cb.asc(product.get("productName")));

        return orders;
    }

    // Price divided by (maxRank + 1 - rank). Proportional to the front-end's
    // "cost per performance point", so sorting ascending lists the best value first.
    private Expression<?> costPerPerformancePoint(CriteriaBuilder cb, Join<ProductEntity, SpecEntity> spec,
                                                  Join<ProductEntity, CostEntity> cost) {

        Short maxRank = entityManager
                .createQuery("select max(s.computeRank) from SpecEntity s", Short.class)
                .getSingleResult();

        if (maxRank == null) return cost.get("cost");

        Expression<Number> performance =
                cb.<Number>diff(cb.literal(maxRank + 1), spec.<Short>get("computeRank"));

        return cb.quot(cost.<BigDecimal>get("cost"), performance);
    }

    private static <T extends Comparable<? super T>> void addRange(CriteriaBuilder cb, List<Predicate> predicates,
                                                                   Path<T> path, T min, T max) {
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

    // User input must not act as a LIKE wildcard ("%" or "_").
    private static String escapeLike(String text) {
        return text
                .replace(String.valueOf(LIKE_ESCAPE), "" + LIKE_ESCAPE + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }

}
