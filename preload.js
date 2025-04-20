const { contextBridge, ipcRenderer } = require("electron");

// Expose selected APIs from the main process to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Dictionary related functions
  lookupWord: (word) => ipcRenderer.invoke("dictionary:lookupWord", word),
  translateText: (text, fromLang, toLang) =>
    ipcRenderer.invoke("translate:translateText", text, fromLang, toLang),

  // Vocabulary management
  getVocabulary: () => ipcRenderer.invoke("vocabulary:getAll"),
  saveWord: (wordData) => ipcRenderer.invoke("vocabulary:saveWord", wordData),
  updateWord: (wordData) =>
    ipcRenderer.invoke("vocabulary:updateWord", wordData),
  deleteWord: (wordId) => ipcRenderer.invoke("vocabulary:deleteWord", wordId),

  // Reading management
  getReadings: () => ipcRenderer.invoke("readings:getAll"),
  saveReading: (readingData) =>
    ipcRenderer.invoke("readings:saveReading", readingData),
  updateReading: (readingData) =>
    ipcRenderer.invoke("readings:updateReading", readingData),
  deleteReading: (readingId) =>
    ipcRenderer.invoke("readings:deleteReading", readingId),

  // Text-to-speech
  speakText: (text) => ipcRenderer.invoke("tts:speak", text),
});
