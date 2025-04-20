import fs from "fs";
import path from "path";
import { getDataFilePath } from "./settingsService";
const Store = require("electron-store").default;

// File name for storing vocabulary data
const VOCABULARY_FILE = "vocab.json";

/**
 * This service combines the functionality of the previous vocabulary-service.js in the root directory
 * with the existing vocabularyService.js in the services folder
 */
class VocabularyService {
  constructor() {
    // For electron main process
    this.store = new Store({
      name: "vocaflow-vocabulary",
      defaults: {
        vocabulary: [],
        progress: {},
      },
    });

    // Initialize the vocabulary if it doesn't exist
    if (!this.store.has("vocabulary")) {
      this.store.set("vocabulary", []);
    }

    // Initialize the progress if it doesn't exist
    if (!this.store.has("progress")) {
      this.store.set("progress", {});
    }
  }

  // Main process methods (from vocabulary-service.js)

  getAllVocabulary() {
    return this.store.get("vocabulary");
  }

  getWordById(id) {
    const vocabulary = this.store.get("vocabulary");
    return vocabulary.find((word) => word.id === id);
  }

  getWordByValue(value) {
    const vocabulary = this.store.get("vocabulary");
    return vocabulary.find(
      (word) => word.word.toLowerCase() === value.toLowerCase()
    );
  }

  addWord(wordData) {
    // Check if word already exists
    const existingWord = this.getWordByValue(wordData.word);

    if (existingWord) {
      // Update existing word
      return this.updateWord({
        ...existingWord,
        ...wordData,
        lastReviewed: new Date().toISOString(),
      });
    } else {
      // Add new word
      const vocabulary = this.store.get("vocabulary");

      const newWord = {
        id: Date.now().toString(),
        word: wordData.word,
        partOfSpeech: wordData.partOfSpeech || "",
        definition: wordData.definition || "",
        exampleSentences: wordData.exampleSentences || [],
        level: wordData.level || "hard",
        lastReviewed: new Date().toISOString(),
      };

      vocabulary.push(newWord);
      this.store.set("vocabulary", vocabulary);
      return newWord;
    }
  }

  updateWord(wordData) {
    const vocabulary = this.store.get("vocabulary");
    const index = vocabulary.findIndex((word) => word.id === wordData.id);

    if (index !== -1) {
      vocabulary[index] = {
        ...vocabulary[index],
        ...wordData,
        lastReviewed: new Date().toISOString(),
      };

      this.store.set("vocabulary", vocabulary);
      return vocabulary[index];
    }

    return null;
  }

  deleteWord(id) {
    const vocabulary = this.store.get("vocabulary");
    const index = vocabulary.findIndex((word) => word.id === id);

    if (index !== -1) {
      const deletedWord = vocabulary[index];
      vocabulary.splice(index, 1);
      this.store.set("vocabulary", vocabulary);
      return deletedWord;
    }

    return null;
  }

  updateWordLevel(id, level) {
    const vocabulary = this.store.get("vocabulary");
    const index = vocabulary.findIndex((word) => word.id === id);

    if (index !== -1) {
      vocabulary[index].level = level;
      vocabulary[index].lastReviewed = new Date().toISOString();
      this.store.set("vocabulary", vocabulary);
      return vocabulary[index];
    }

    return null;
  }

  getWordsForReview() {
    const vocabulary = this.store.get("vocabulary");
    const now = new Date();
    const hardReviewInterval = 1 * 24 * 60 * 60 * 1000; // 1 day
    const familiarReviewInterval = 3 * 24 * 60 * 60 * 1000; // 3 days

    return vocabulary.filter((word) => {
      const lastReviewDate = new Date(word.lastReviewed);
      const daysSinceLastReview = now - lastReviewDate;

      if (word.level === "hard" && daysSinceLastReview > hardReviewInterval) {
        return true;
      }

      if (
        word.level === "familiar" &&
        daysSinceLastReview > familiarReviewInterval
      ) {
        return true;
      }

      return false;
    });
  }

  bulkUpdateLevel(wordIds, level) {
    const vocabulary = this.store.get("vocabulary");
    const updatedWords = [];

    wordIds.forEach((id) => {
      const index = vocabulary.findIndex((word) => word.id === id);
      if (index !== -1) {
        vocabulary[index].level = level;
        vocabulary[index].lastReviewed = new Date().toISOString();
        updatedWords.push(vocabulary[index]);
      }
    });

    this.store.set("vocabulary", vocabulary);
    return updatedWords;
  }

  // Renderer process methods (from src/services/vocabularyService.js)

  /**
   * Get the initial vocabulary data structure
   *
   * @returns {Object} Empty vocabulary data structure
   */
  getInitialVocabularyData() {
    return {
      words: [],
      categories: [],
      meta: {
        lastUpdate: new Date().toISOString(),
      },
    };
  }

  /**
   * Load vocabulary data from storage (renderer process)
   *
   * @returns {Promise<Object>} Vocabulary data object
   */
  async getVocabularyData() {
    try {
      const filePath = await getDataFilePath(VOCABULARY_FILE);

      if (!fs.existsSync(filePath)) {
        return this.getInitialVocabularyData();
      }

      const data = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading vocabulary data:", error);
      throw new Error(`Failed to load vocabulary data: ${error.message}`);
    }
  }

  /**
   * Save vocabulary data to storage (renderer process)
   *
   * @param {Object} data - Vocabulary data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveVocabularyData(data) {
    try {
      // Update the last modified timestamp
      const dataToSave = {
        ...data,
        meta: {
          ...data.meta,
          lastUpdate: new Date().toISOString(),
        },
      };

      const filePath = await getDataFilePath(VOCABULARY_FILE);
      const fileDir = path.dirname(filePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(fileDir)) {
        await fs.promises.mkdir(fileDir, { recursive: true });
      }

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(dataToSave, null, 2),
        "utf8"
      );
      return true;
    } catch (error) {
      console.error("Error saving vocabulary data:", error);
      throw new Error(`Failed to save vocabulary data: ${error.message}`);
    }
  }

  /**
   * Add a new word to the vocabulary (renderer process)
   *
   * @param {Object} word - Word object with text, definition, etc.
   * @returns {Promise<Object>} The saved word with generated ID
   */
  async addWordToRenderer(word) {
    try {
      const vocabData = await this.getVocabularyData();

      // Generate a new ID
      const newId =
        vocabData.words.length > 0
          ? Math.max(...vocabData.words.map((w) => w.id)) + 1
          : 1;

      const newWord = {
        ...word,
        id: newId,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null,
      };

      vocabData.words.push(newWord);
      await this.saveVocabularyData(vocabData);

      return newWord;
    } catch (error) {
      console.error("Error adding word:", error);
      throw new Error(`Failed to add word: ${error.message}`);
    }
  }

  /**
   * Update an existing word (renderer process)
   *
   * @param {number} id - ID of the word to update
   * @param {Object} updatedWord - Updated word data
   * @returns {Promise<Object|null>} The updated word or null if not found
   */
  async updateWordInRenderer(id, updatedWord) {
    try {
      const vocabData = await this.getVocabularyData();
      const index = vocabData.words.findIndex(
        (word) => word.id === parseInt(id)
      );

      if (index === -1) {
        return null;
      }

      // Keep the original ID and creation date
      vocabData.words[index] = {
        ...vocabData.words[index],
        ...updatedWord,
        id: vocabData.words[index].id,
        createdAt: vocabData.words[index].createdAt,
        updatedAt: new Date().toISOString(),
      };

      await this.saveVocabularyData(vocabData);
      return vocabData.words[index];
    } catch (error) {
      console.error("Error updating word:", error);
      throw new Error(`Failed to update word: ${error.message}`);
    }
  }

  /**
   * Delete a word by ID (renderer process)
   *
   * @param {number} id - ID of the word to delete
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteWordFromRenderer(id) {
    try {
      const vocabData = await this.getVocabularyData();
      const initialLength = vocabData.words.length;

      vocabData.words = vocabData.words.filter(
        (word) => word.id !== parseInt(id)
      );

      if (vocabData.words.length === initialLength) {
        // No word was removed
        return false;
      }

      await this.saveVocabularyData(vocabData);
      return true;
    } catch (error) {
      console.error("Error deleting word:", error);
      throw new Error(`Failed to delete word: ${error.message}`);
    }
  }

  /**
   * Add a new category
   *
   * @param {Object} category - Category object with name, etc.
   * @returns {Promise<Object>} The saved category with generated ID
   */
  async addCategory(category) {
    try {
      const vocabData = await this.getVocabularyData();

      // Generate a new ID
      const newId =
        vocabData.categories.length > 0
          ? Math.max(...vocabData.categories.map((c) => c.id)) + 1
          : 1;

      const newCategory = {
        ...category,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      vocabData.categories.push(newCategory);
      await this.saveVocabularyData(vocabData);

      return newCategory;
    } catch (error) {
      console.error("Error adding category:", error);
      throw new Error(`Failed to add category: ${error.message}`);
    }
  }

  /**
   * Get words by category ID
   *
   * @param {number} categoryId - Category ID to filter by
   * @returns {Promise<Array>} Words belonging to the category
   */
  async getWordsByCategory(categoryId) {
    try {
      const vocabData = await this.getVocabularyData();
      return vocabData.words.filter(
        (word) =>
          word.categories && word.categories.includes(parseInt(categoryId))
      );
    } catch (error) {
      console.error("Error getting words by category:", error);
      throw new Error(`Failed to get words by category: ${error.message}`);
    }
  }

  /**
   * Record a word review event
   *
   * @param {number} wordId - ID of the reviewed word
   * @param {Object} reviewData - Review data (correct, difficulty, etc.)
   * @returns {Promise<Object>} Updated word data
   */
  async recordWordReview(wordId, reviewData) {
    try {
      const vocabData = await this.getVocabularyData();
      const index = vocabData.words.findIndex(
        (word) => word.id === parseInt(wordId)
      );

      if (index === -1) {
        throw new Error(`Word with ID ${wordId} not found`);
      }

      // Update the word's review data
      vocabData.words[index] = {
        ...vocabData.words[index],
        reviewCount: (vocabData.words[index].reviewCount || 0) + 1,
        lastReviewed: new Date().toISOString(),
        reviewHistory: [
          ...(vocabData.words[index].reviewHistory || []),
          {
            ...reviewData,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await this.saveVocabularyData(vocabData);
      return vocabData.words[index];
    } catch (error) {
      console.error("Error recording word review:", error);
      throw new Error(`Failed to record word review: ${error.message}`);
    }
  }
}

// Create a singleton instance
const vocabularyService = new VocabularyService();

// Export for renderer process (named exports for ES modules)
export const {
  getVocabularyData,
  saveVocabularyData,
  addWordToRenderer,
  updateWordInRenderer,
  deleteWordFromRenderer,
  addCategory,
  getWordsByCategory,
  recordWordReview,
} = vocabularyService;

// For CommonJS require in main process
module.exports = vocabularyService;
