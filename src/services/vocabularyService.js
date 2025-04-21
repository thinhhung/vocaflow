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
      const newWord = {
        ...wordData,
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
