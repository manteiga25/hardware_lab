package com.web.app.Database;

import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.CostEntity;
import com.web.app.Api.Entity.ProductEntity;
import com.web.app.Api.Entity.SpecEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class DatabaseRepository implements CustomRepository {

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
        cq.select(product).where(cb.in(product.get("productName")).value(name));
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
                                    query.productName().toLowerCase() +
                                    "%"
                    )
            );
        }

        if (query.brand() != null) {

            predicates.add(
                    cb.equal(
                            product.get("brand"),
                            query.brand()
                    )
            );
        }

        if (query.socketName() != null) {

            predicates.add(
                    cb.equal(
                            product.get("socketName"),
                            query.socketName()
                    )
            );
        }

        // Spec
        if (query.minCoreCount() != null) {

            predicates.add(
                    cb.greaterThanOrEqualTo(
                            spec.get("coreCount"),
                            query.minCoreCount().shortValue()
                    )
            );
        }

        if (query.maxCoreCount() != null) {

            predicates.add(
                    cb.lessThanOrEqualTo(
                            spec.get("coreCount"),
                            query.maxCoreCount().shortValue()
                    )
            );
        }

        // Cost
        if (query.maxCost() != null) {

            predicates.add(
                    cb.lessThanOrEqualTo(
                            cost.get("cost"),
                            query.maxCost()
                    )
            );
        }

        cq.where(predicates.toArray(new Predicate[0]));

        return entityManager
                .createQuery(cq)
                .setMaxResults(page.getPageSize())
                .setFirstResult((int) page.getOffset())
                .getResultList();
    }

}
