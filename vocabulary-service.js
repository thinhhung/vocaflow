const Store = require("electron-store").default;
const { app } = require("electron");

class VocabularyService {
  constructor() {
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
}

module.exports = new VocabularyService();
