import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
// Initialize @electron/remote
import {
  initialize,
  enable as enableRemote,
} from "@electron/remote/main/index.js";
initialize();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import services - use named imports instead of default imports
import dictionaryService from "./src/services/dictionaryService.js";
import { vocabularyService } from "./src/services/vocabularyService.js";
import { readingService } from "./src/services/readingService.js";

// Debug logging to troubleshoot service methods
console.log("Reading service methods:", Object.keys(readingService));
console.log("Vocabulary service methods:", Object.keys(vocabularyService));

// Make sure required methods exist, otherwise create them
if (!readingService.getAllReadings) {
  console.error(
    "WARNING: readingService.getAllReadings not found, creating fallback"
  );
  readingService.getAllReadings = function () {
    console.log("Using fallback getAllReadings method");
    if (this.initializeReadingsFile && this.readingsFilePath) {
      this.initializeReadingsFile();
      const readingsData = fs.readFileSync(this.readingsFilePath, "utf-8");
      return JSON.parse(readingsData);
    }
    return [];
  };
}

if (!vocabularyService.getAllVocabulary) {
  console.error(
    "WARNING: vocabularyService.getAllVocabulary not found, creating fallback"
  );
  vocabularyService.getAllVocabulary = function () {
    console.log("Using fallback getAllVocabulary method");
    if (this.store) {
      return this.store.get("vocabulary");
    }
    return [];
  };
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Keep using preload.js
      contextIsolation: true,
      nodeIntegration: true, // Enable Node.js integration
      enableRemoteModule: true, // Enable remote module
    },
  });

  // Enable remote module for this window
  enableRemote(mainWindow.webContents);

  mainWindow.loadFile("index.html");

  // Always open DevTools for debugging purposes
  mainWindow.webContents.openDevTools();
}

// Initialize the app when Electron is ready
app.whenReady().then(() => {
  createWindow();

  // Set up IPC handlers for dictionary lookups
  ipcMain.handle("dictionary:lookupWord", async (event, word) => {
    try {
      return await dictionaryService.lookupWord(word);
    } catch (error) {
      console.error("Error in dictionary:lookupWord:", error);
      return { error: error.message, word };
    }
  });

  // Set up IPC handlers for translation
  ipcMain.handle(
    "translate:translateText",
    async (event, text, fromLang, toLang) => {
      try {
        return await dictionaryService.translateText(text, fromLang, toLang);
      } catch (error) {
        console.error("Error in translate:translateText:", error);
        return { error: error.message, original: text };
      }
    }
  );

  // Set up IPC handlers for vocabulary management
  ipcMain.handle("vocabulary:getAll", async () => {
    return vocabularyService.getAllVocabulary();
  });

  ipcMain.handle("vocabulary:saveWord", async (event, wordData) => {
    return vocabularyService.addWord(wordData);
  });

  ipcMain.handle("vocabulary:updateWord", async (event, wordData) => {
    return vocabularyService.updateWord(wordData);
  });

  ipcMain.handle("vocabulary:deleteWord", async (event, wordId) => {
    return vocabularyService.deleteWord(wordId);
  });

  // Set up IPC handlers for readings management
  ipcMain.handle("readings:getAll", async () => {
    return readingService.getAllReadings();
  });

  ipcMain.handle("readings:saveReading", async (event, readingData) => {
    return readingService.addReading(readingData);
  });

  ipcMain.handle("readings:updateReading", async (event, readingData) => {
    return readingService.updateReading(readingData);
  });

  ipcMain.handle("readings:deleteReading", async (event, readingId) => {
    return readingService.deleteReading(readingId);
  });

  // Set up TTS handler
  ipcMain.handle("tts:speak", async (event, text) => {
    // Send the text back to the renderer to use the Web Speech API
    mainWindow.webContents.executeJavaScript(`
      try {
        const utterance = new SpeechSynthesisUtterance("${text.replace(
          /"/g,
          '\\"'
        )}");
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('TTS error:', error);
      }
    `);

    return { success: true };
  });

  // Set up Node.js filesystem access handlers
  ipcMain.handle("fs:readFile", async (event, filepath, options) => {
    try {
      return await fs.promises.readFile(filepath, options);
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });

  ipcMain.handle("fs:writeFile", async (event, filepath, data, options) => {
    try {
      await fs.promises.writeFile(filepath, data, options);
      return true;
    } catch (error) {
      console.error("Error writing file:", error);
      throw error;
    }
  });

  ipcMain.handle("fs:exists", (event, filepath) => {
    return fs.existsSync(filepath);
  });

  ipcMain.handle("fs:mkdir", async (event, dirPath, options) => {
    try {
      await fs.promises.mkdir(dirPath, options);
      return true;
    } catch (error) {
      console.error("Error creating directory:", error);
      throw error;
    }
  });

  // Set up path utility handlers
  ipcMain.handle("path:join", (event, ...args) => {
    return path.join(...args);
  });

  ipcMain.handle("path:dirname", (event, filepath) => {
    return path.dirname(filepath);
  });

  // Set up app utility handlers
  ipcMain.handle("app:getPath", (event, name) => {
    return app.getPath(name);
  });

  // Add dialog handler for selecting folder
  ipcMain.handle("dialog:selectFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Folder for VocaFlow Data",
    });
    return result;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Close the dictionary service when the app is quitting
app.on("quit", async () => {
  await dictionaryService.close();
});
