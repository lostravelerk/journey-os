export type MemoryRefineInput = {
  content: string;
};

export type StoryAssistInput = {
  seedText?: string;
  memoryText?: string;
};

export type StoryAssistResult = {
  intro: string;
  body: string;
  closing: string;
};

export type JourneyAiService = {
  refineMemory: (input: MemoryRefineInput) => Promise<string>;
  draftStory: (input: StoryAssistInput) => Promise<StoryAssistResult>;
};

export const mockJourneyAiService: JourneyAiService = {
  async refineMemory(input) {
    return input.content.trim();
  },
  async draftStory(input) {
    const base = input.seedText?.trim() || input.memoryText?.trim() || "";
    return {
      intro: base,
      body: base,
      closing: ""
    };
  }
};

export function getJourneyAiService(): JourneyAiService {
  return mockJourneyAiService;
}
