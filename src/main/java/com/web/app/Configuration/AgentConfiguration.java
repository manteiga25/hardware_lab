package com.web.app.Configuration;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AgentConfiguration {

    // The model cannot guess what the columns mean: computeRank is a position for CPUs and a
    // score for GPUs, and a 0 price means "unknown", not "free".
    private static final String SYSTEM_PROMPT = """
            You help visitors of a hardware catalogue find and compare processors (CPUs) and graphics cards (GPUs).
            Always use the tools to look up real data. Never invent products, prices or specifications, and use the
            product names exactly as the tools return them. Every value you state must appear in a tool result;
            when it does not, say that the catalogue does not have it.
            When the user names products, such as "compare the RTX 4060 with the RX 7600", call getProductsByName
            with those names instead of searching, and make sure each value you quote comes from the entry with
            that same name. Answer in the language the user writes in (usually
            European Portuguese), in a few short sentences, and say so plainly when the data does not answer the question.
            Write plain sentences and short bullet lists. Do not use markdown tables or headings: the answer is
            shown in a chat panel where they do not render.

            How to read the data:
            - Processors (isCpu true) have spec.computeRank: a position in a ranking, where 1 is the fastest.
            - Graphics cards (isCpu false) have gpuSpec.computeRank: a score from 0 to 1000, where 1000 is the
              fastest and 0 means the card was never scored. It is not a position.
            - cost.cost is in US dollars, and for graphics cards it is the launch price. 0 or null means the price
              is unknown: never present it as free or as cheap.
            - Value for money means price against performance, always between products of the same type.
            - Clock speeds are in GHz for processors and in MHz for graphics cards; memory sizes are in megabytes.
            """;

    @Bean
    public Advisor chatMemoryAdvisor() {
        return MessageChatMemoryAdvisor.builder(MessageWindowChatMemory.builder().maxMessages(20).build()).build();
    }

    @Bean
    public ChatClient chatClient(OllamaChatModel chatModel, Advisor chatMemoryAdvisor, AgentComponents tools) {
        return ChatClient.builder(chatModel)
                .defaultSystem(SYSTEM_PROMPT)
                .defaultAdvisors(chatMemoryAdvisor)
                .defaultTools(tools)
                .build();
    }

}
