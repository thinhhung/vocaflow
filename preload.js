// Use CommonJS style require for Electron
const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Dictionary functions
  lookupWord: (word) => ipcRenderer.invoke("dictionary:lookupWord", word),
  translateText: (text, fromLang, toLang) =>
    ipcRenderer.invoke("translate:translateText", text, fromLang, toLang),

  // Vocabulary management
  getAllVocabulary: () => ipcRenderer.invoke("vocabulary:getAll"),
  saveWord: (wordData) => ipcRenderer.invoke("vocabulary:saveWord", wordData),
  updateWord: (wordData) =>
    ipcRenderer.invoke("vocabulary:updateWord", wordData),
  deleteWord: (wordId) => ipcRenderer.invoke("vocabulary:deleteWord", wordId),

  // Readings management
  getAllReadings: () => ipcRenderer.invoke("readings:getAll"),
  saveReading: (readingData) =>
    ipcRenderer.invoke("readings:saveReading", readingData),
  updateReading: (readingData) =>
    ipcRenderer.invoke("readings:updateReading", readingData),
  deleteReading: (readingId) =>
    ipcRenderer.invoke("readings:deleteReading", readingId),

  // Text-to-speech
  speak: (text) => ipcRenderer.invoke("tts:speak", text),

  // Filesystem access
  readFile: (filepath, options) =>
    ipcRenderer.invoke("fs:readFile", filepath, options),
  writeFile: (filepath, data, options) =>
    ipcRenderer.invoke("fs:writeFile", filepath, data, options),
  fileExists: (filepath) => ipcRenderer.invoke("fs:exists", filepath),
  createDirectory: (dirPath, options) =>
    ipcRenderer.invoke("fs:mkdir", dirPath, options),

  // Path utilities
  joinPath: (...args) => ipcRenderer.invoke("path:join", ...args),
  getDirname: (filepath) => ipcRenderer.invoke("path:dirname", filepath),

  // App utilities
  getPath: (name) => ipcRenderer.invoke("app:getPath", name),

  // Dialog utilities
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
});
