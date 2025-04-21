// Add these imports if they don't exist already
const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain } = require("electron");

// Reading progress functionality
function getReadingProgressPath() {
  return path.join(app.getPath("userData"), "readingProgress.json");
}

function loadReadingProgress() {
  const progressPath = getReadingProgressPath();
  try {
    if (fs.existsSync(progressPath)) {
      const data = fs.readFileSync(progressPath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading reading progress:", err);
  }
  return {};
}

function saveReadingProgress(progress) {
  const progressPath = getReadingProgressPath();
  try {
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving reading progress:", err);
  }
}

// Register the IPC handlers
ipcMain.handle("get-reading-progress", async (event, readingId) => {
  try {
    const progress = loadReadingProgress();
    return progress[readingId] || { completedPages: [], lastPage: 1 };
  } catch (err) {
    console.error("Error in get-reading-progress:", err);
    throw err;
  }
});

ipcMain.handle(
  "save-reading-progress",
  async (event, readingId, progressData) => {
    try {
      const allProgress = loadReadingProgress();
      allProgress[readingId] = progressData;
      saveReadingProgress(allProgress);
      return true;
    } catch (err) {
      console.error("Error in save-reading-progress:", err);
      throw err;
    }
  }
);
