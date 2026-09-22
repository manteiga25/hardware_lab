package com.web.app.Configuration;

import com.web.app.Api.DTO.ProductDTO;
import com.web.app.Api.DTO.SearchDTO;
import com.web.app.Api.Entity.CpuCategory;
import com.web.app.Database.DatabaseService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AgentComponents {

    // A search feeds the model a shortlist, so it stays small: twenty full products (a graphics
    // card alone has about forty fields) overflow the model's context window.
    private static final int MAX_RESULTS = 10;
    private static final int MAX_DETAILED = 4;

    @Autowired
    private DatabaseService databaseService;

    /**
     * Search filters. Every field is optional and they are combined with AND.
     * Each one becomes a property of the JSON schema the model receives, with its description:
     * a plain Map would arrive as an empty "object" and the model would have to guess the keys.
     */
    public record SearchCriteria(
            @ToolParam(required = false, description = "Part of the product name; the words may come in any order, for example \"rtx 4060\" or \"ryzen 5600x\"")
            String name,

            @ToolParam(required = false, description = "Manufacturer, exactly as stored: AMD, Intel, NVIDIA, ATI, Apple, Qualcomm, MediaTek, Samsung, Matrox, 3dfx")
            String brand,

            @ToolParam(required = false, description = "true returns only processors, false only graphics cards. Always set it unless the user really wants both")
            Boolean isCpu,

            @ToolParam(required = false, description = "Processors only: what the processor is made for. Desktop (a tower PC), Laptop, Server (servers and workstations), Embedded (embedded and IoT boards), Mobile (phones and tablets) or Unknown")
            CpuCategory category,

            @ToolParam(required = false, description = "Product line, for example \"AMD Ryzen\" or \"GeForce 40\"")
            String family,

            @ToolParam(required = false, description = "Processors only: minimum number of cores")
            Integer minCoreCount,

            @ToolParam(required = false, description = "Processors only: minimum number of threads")
            Integer minThreadCount,

            @ToolParam(required = false, description = "Maximum power draw in watts")
            Integer maxTdp,

            @ToolParam(required = false, description = "Minimum price in US dollars")
            Double minCost,

            @ToolParam(required = false, description = "Maximum price in US dollars (for graphics cards this is the launch price)")
            Double maxCost,

            @ToolParam(required = false, description = "Released on or after this date, as YYYY-MM-DD")
            String minReleaseDate,

            @ToolParam(required = false, description = "Graphics cards only: desktop (a card you install), mobile (laptop) or integrated")
            String formFactor,

            @ToolParam(required = false, description = "Graphics cards only: minimum memory in megabytes, so 8 GB is 8192")
            Integer minMemoryMb,

            @ToolParam(required = false, description = "Graphics cards only: true returns only cards with ray tracing cores")
            Boolean hasRayTracing,

            @ToolParam(required = false, description = "Processors only: highest ranking position allowed, where 1 is the fastest. Use 400 for roughly the fastest 10%")
            Integer maxComputeRank,

            @ToolParam(required = false, description = "Graphics cards only: minimum score from 0 to 1000, where 1000 is the fastest. Use 900 for roughly the fastest 10%")
            Integer minComputeRank,

            @ToolParam(required = false, description = "How to order the results: \"performance\" (fastest first, the default), \"value\" (best price per performance), \"cheapest\" or \"newest\"")
            String orderBy,

            @ToolParam(required = false, description = "true also returns products with no registered price, such as server and laptop parts. By default only products with a known price are returned")
            Boolean includeWithoutPrice
    ) {}

    // Each tool needs its own name, so the two searches cannot both be called searchProducts.
    @Tool(name = "searchProducts", description = """
            Search the hardware catalogue and return a shortlist of at most 10 matching processors or graphics
            cards, with the main values of each one. Use it whenever the user asks what to buy or what exists, and
            read the prices and performance values from the result instead of from memory. Call getProductsByName
            afterwards for the full specifications of the ones worth discussing.""")
    public List<Map<String, Object>> searchProducts(SearchCriteria criteria) {
        List<ProductDTO> products = databaseService.getProducts(toSearchDTO(criteria), toPageable(criteria));
        return products == null ? List.of() : products.stream().map(AgentComponents::summarise).toList();
    }

    @Tool(name = "getProductsByName", description = """
            Get the full specifications of at most 4 products from their exact names, for example to compare two
            of them. Use searchProducts first when the exact name is not known.""")
    public List<ProductDTO> getProductsByName(List<String> names) {
        List<ProductDTO> products = databaseService.getProducts(names.stream().limit(MAX_DETAILED).toList());
        return products == null ? List.of() : products;
    }

    // Only the values that matter to choose between products, and only the ones that are known:
    // empty fields would be tokens spent on nothing.
    private static Map<String, Object> summarise(ProductDTO product) {
        boolean isCpu = !Boolean.FALSE.equals(product.isCpu());
        Map<String, Object> summary = new LinkedHashMap<>();

        put(summary, "name", product.productName());
        put(summary, "brand", product.brand());
        summary.put("type", isCpu ? "CPU" : "GPU");
        put(summary, "family", product.family());
        put(summary, "released", product.releaseDate());
        put(summary, "priceUsd", positive(product.cost() == null ? null : product.cost().cost()));

        if (isCpu && product.spec() != null) {
            var spec = product.spec();
            put(summary, "rankingPosition1IsFastest", spec.computeRank());
            put(summary, "cores", spec.coreCount());
            put(summary, "threads", spec.threadCount());
            put(summary, "boostClockGhz", positive(spec.boostClock()));
            put(summary, "socket", product.socketName());
            put(summary, "tdpWatts", positive(spec.tdp()));
            put(summary, "category", spec.category());
        }

        if (!isCpu && product.gpuSpec() != null) {
            var spec = product.gpuSpec();
            put(summary, "score0to1000", positive(spec.computeRank()));
            put(summary, "fp32Tflops", spec.fp32Gflops() == null ? null : spec.fp32Gflops().doubleValue() / 1000);
            put(summary, "formFactor", spec.formFactor());
            put(summary, "memoryMb", spec.memoryShared() ? null : spec.memorySizeMb());
            put(summary, "memoryType", spec.memoryType());
            put(summary, "rayTracingCores", positive(spec.rtCores()));
            put(summary, "tdpWatts", positive(spec.tdp()));
        }

        return summary;
    }

    // 0 means "unknown" in this database, both for prices and for specifications.
    private static Object positive(Number value) {
        return value == null || value.doubleValue() <= 0 ? null : value;
    }

    private SearchDTO toSearchDTO(SearchCriteria criteria) {
        Map<String, Object> values = new LinkedHashMap<>();
        put(values, "name", criteria.name());
        put(values, "brand", criteria.brand());
        put(values, "isCpu", criteria.isCpu());
        put(values, "family", criteria.family());
        put(values, "minCoreCount", criteria.minCoreCount());
        put(values, "minThreadCount", criteria.minThreadCount());
        put(values, "maxTdp", criteria.maxTdp());
        put(values, "minCost", criteria.minCost());
        put(values, "maxCost", criteria.maxCost());
        put(values, "minReleaseDate", criteria.minReleaseDate());
        put(values, "formFactor", criteria.formFactor());
        put(values, "minMemoryMb", criteria.minMemoryMb());
        put(values, "hasRayTracing", criteria.hasRayTracing());
        put(values, "maxComputeRank", criteria.maxComputeRank());
        put(values, "minComputeRank", criteria.minComputeRank());
        put(values, "category", criteria.category());

        // A price of 0 means "unknown". Someone choosing what to buy does not want those, and this
        // way the model cannot present them as cheap, so they are left out unless asked for.
        boolean withoutPrice = Boolean.TRUE.equals(criteria.includeWithoutPrice()) && !orderedByPrice(criteria);
        if (!withoutPrice && criteria.minCost() == null) values.put("minCost", "0.01");

        return SearchDTO.fromMap(values);
    }

    private Pageable toPageable(SearchCriteria criteria) {
        String orderBy = criteria.orderBy() == null ? "" : criteria.orderBy().trim().toLowerCase();

        Sort sort = switch (orderBy) {
            case "value" -> Sort.by(Sort.Direction.ASC, "value");
            case "cheapest" -> Sort.by(Sort.Direction.ASC, "cost");
            case "newest" -> Sort.by(Sort.Direction.DESC, "releaseDate");
            // Fastest first: for processors the lowest position, for graphics cards the highest score.
            default -> Boolean.FALSE.equals(criteria.isCpu())
                    ? Sort.by(Sort.Direction.DESC, "rank")
                    : Sort.by(Sort.Direction.ASC, "rank");
        };

        return PageRequest.of(0, MAX_RESULTS, sort);
    }

    private static boolean orderedByPrice(SearchCriteria criteria) {
        return "value".equalsIgnoreCase(criteria.orderBy()) || "cheapest".equalsIgnoreCase(criteria.orderBy());
    }

    private static void put(Map<String, Object> values, String key, Object value) {
        if (value != null) values.put(key, value);
    }

}
