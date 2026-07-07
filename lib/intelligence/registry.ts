import type { IntelligenceProvider, IntelligenceRequestType } from "@/lib/intelligence/types";

export type IntelligenceCapability = {
  id: IntelligenceRequestType;
  labelKey: string;
  provider: IntelligenceProvider;
  output: "ai_draft";
  surface: "moment" | "future" | "memory";
};

export const intelligenceCapabilities: IntelligenceCapability[] = [
  {
    id: "memory_line",
    labelKey: "journeys.intelligenceMemoryRefine",
    provider: "deepseek",
    output: "ai_draft",
    surface: "moment"
  },
  {
    id: "journey_import",
    labelKey: "journeys.intelligenceFutureImport",
    provider: "deepseek",
    output: "ai_draft",
    surface: "future"
  }
];

export const intelligenceProviders: IntelligenceProvider[] = ["deepseek", "mock"];
