// Add these imports if they don't exist
import path from "path";
import fs from "fs";

// Add these handlers to your existing ipcMain.handle calls:

ipcMain.handle("save-reading-progress", async (event, readingId, progress) => {
  try {
    const progressDir = path.join(app.getPath("userData"), "readingProgress");

    // Create directory if it doesn't exist
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }

    const progressPath = path.join(progressDir, `${readingId}.json`);
    fs.writeFileSync(progressPath, JSON.stringify(progress));

    return { success: true };
  } catch (error) {
    console.error("Error saving reading progress:", error);
    throw error;
  }
});

ipcMain.handle("get-reading-progress", async (event, readingId) => {
  try {
    const progressPath = path.join(
      app.getPath("userData"),
      "readingProgress",
      `${readingId}.json`
    );

    if (fs.existsSync(progressPath)) {
      const data = fs.readFileSync(progressPath, "utf-8");
      return JSON.parse(data);
    }

    return null;
  } catch (error) {
    console.error("Error getting reading progress:", error);
    throw error;
  }
});
