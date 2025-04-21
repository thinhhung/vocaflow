import { getSettings } from "./settingsService.js";

export class OpenAIService {
  constructor() {
    this.initialized = false;
    this.settings = null;
  }

  async initialize() {
    if (!this.initialized) {
      this.settings = await getSettings();
      this.initialized = true;
    }
    return this;
  }

  async generateCompletion(prompt, options = {}) {
    await this.initialize();

    const { apiKey, apiUrl, model } = this.settings.openAI;

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    const requestBody = {
      model: options.model || model,
      messages: [
        {
          role: "system",
          content:
            options.systemPrompt ||
            "You are a helpful assistant for language learning.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
    };

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating completion:", error);
      throw error;
    }
  }

  // Example method for vocabulary assistance
  async explainWord(word, context) {
    const prompt = `Please explain the word "${word}" in the context: "${context}". 
    Include: 
    1. Definition 
    2. Example sentences
    3. Synonyms
    4. Related words`;

    return this.generateCompletion(prompt);
  }

  // Example method for generating example sentences
  async generateExampleSentences(word, count = 3) {
    const prompt = `Generate ${count} natural, contextually varied example sentences using the word "${word}".`;

    return this.generateCompletion(prompt);
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();
export default openAIService;
