import fs from "fs";
import path from "path";
import { getDataFilePath } from "./settingsService";

// Save vocabulary data to the configured location
export const saveVocabularyData = async (data) => {
  try {
    const filePath = await getDataFilePath("vocab.json");
    const fileDir = path.dirname(filePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(fileDir)) {
      await fs.promises.mkdir(fileDir, { recursive: true });
    }

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error("Error saving vocabulary data:", error);
    throw new Error(`Failed to save vocabulary data: ${error.message}`);
  }
};

// Load vocabulary data from the configured location
export const loadVocabularyData = async () => {
  try {
    const filePath = await getDataFilePath("vocab.json");

    if (!fs.existsSync(filePath)) {
      // Return empty data structure if file doesn't exist yet
      return { words: [], categories: [] };
    }

    const data = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading vocabulary data:", error);
    throw new Error(`Failed to load vocabulary data: ${error.message}`);
  }
};

// Save progress data to the configured location
export const saveProgressData = async (data) => {
  try {
    const filePath = await getDataFilePath("progress.json");
    const fileDir = path.dirname(filePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(fileDir)) {
      await fs.promises.mkdir(fileDir, { recursive: true });
    }

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error("Error saving progress data:", error);
    throw new Error(`Failed to save progress data: ${error.message}`);
  }
};

// Load progress data from the configured location
export const loadProgressData = async () => {
  try {
    const filePath = await getDataFilePath("progress.json");

    if (!fs.existsSync(filePath)) {
      // Return empty data structure if file doesn't exist yet
      return { sessions: [] };
    }

    const data = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading progress data:", error);
    throw new Error(`Failed to load progress data: ${error.message}`);
  }
};
