const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const dictionaryService = require("./src/services/dictionaryService");
const vocabularyService = require("./src/services/vocabularyService");
const readingService = require("./src/services/readingService");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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
