import { app } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VocabularyService {
  constructor() {
    this.vocabularyFilePath = path.join(
      app.getPath("userData"),
      "vocabulary.json"
    );
    this.initializeVocabularyFile();
  }

  initializeVocabularyFile() {
    try {
      if (!fs.existsSync(this.vocabularyFilePath)) {
        const userDataDir = path.dirname(this.vocabularyFilePath);
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        fs.writeFileSync(this.vocabularyFilePath, JSON.stringify([]));
        console.log("Created new vocabulary file at:", this.vocabularyFilePath);
      }
    } catch (error) {
      console.error("Error initializing vocabulary file:", error);
    }
  }

  getAllVocabulary() {
    try {
      const data = fs.readFileSync(this.vocabularyFilePath, "utf-8");
      return JSON.parse(data || "[]");
    } catch (error) {
      console.error("Error reading vocabulary file:", error);
      return [];
    }
  }

  addWord(wordData) {
    try {
      const vocabulary = this.getAllVocabulary();

      // Check if word already exists (case insensitive comparison)
      const normalizedWord = wordData.word.toLowerCase();
      const existingWord = vocabulary.find(
        (item) => item.word && item.word.toLowerCase() === normalizedWord
      );

      // Extract context sentence if available
      const contextSentence = wordData.contextSentence || null;

      // If there's a context sentence, add it to exampleSentences
      const updatedWordData = { ...wordData };
      if (contextSentence) {
        updatedWordData.exampleSentences = [
          ...(updatedWordData.exampleSentences || []),
        ];

        // Only add the context sentence if it's not already in the examples
        if (!updatedWordData.exampleSentences.includes(contextSentence)) {
          updatedWordData.exampleSentences.unshift(contextSentence);
        }
      }

      // If the word already exists, update it instead of adding a duplicate
      if (existingWord) {
        // Merge example sentences without duplicates
        if (existingWord.exampleSentences && updatedWordData.exampleSentences) {
          const uniqueSentences = [
            ...new Set([
              ...updatedWordData.exampleSentences,
              ...(existingWord.exampleSentences || []),
            ]),
          ];
          updatedWordData.exampleSentences = uniqueSentences;
        }

        // Preserve the existing ID and dateAdded
        const updatedWord = {
          ...existingWord,
          ...updatedWordData,
          id: existingWord.id,
          dateAdded: existingWord.dateAdded,
          dateModified: new Date().toISOString(),
        };

        // Replace the existing word with the updated one
        const index = vocabulary.findIndex(
          (item) => item.id === existingWord.id
        );
        vocabulary[index] = updatedWord;
        fs.writeFileSync(this.vocabularyFilePath, JSON.stringify(vocabulary));
        return updatedWord;
      }

      // Otherwise, add as a new word
      const newWord = {
        ...updatedWordData,
        id: uuidv4(),
        dateAdded: new Date().toISOString(),
      };
      vocabulary.push(newWord);
      fs.writeFileSync(this.vocabularyFilePath, JSON.stringify(vocabulary));
      return newWord;
    } catch (error) {
      console.error("Error adding word to vocabulary:", error);
      throw error;
    }
  }

  updateWord(wordData) {
    try {
      const vocabulary = this.getAllVocabulary();
      const index = vocabulary.findIndex((word) => word.id === wordData.id);
      if (index !== -1) {
        vocabulary[index] = {
          ...vocabulary[index],
          ...wordData,
          dateModified: new Date().toISOString(),
        };
        fs.writeFileSync(this.vocabularyFilePath, JSON.stringify(vocabulary));
        return vocabulary[index];
      }
      throw new Error("Word not found");
    } catch (error) {
      console.error("Error updating word in vocabulary:", error);
      throw error;
    }
  }

  deleteWord(wordId) {
    try {
      let vocabulary = this.getAllVocabulary();
      vocabulary = vocabulary.filter((word) => word.id !== wordId);
      fs.writeFileSync(this.vocabularyFilePath, JSON.stringify(vocabulary));
      return { success: true, id: wordId };
    } catch (error) {
      console.error("Error deleting word from vocabulary:", error);
      throw error;
    }
  }
}

const vocabularyService = new VocabularyService();
export { vocabularyService };
