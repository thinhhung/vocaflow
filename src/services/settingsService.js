import fs from "fs";
import path from "path";

// Default settings
const DEFAULT_SETTINGS = {
  dataFolder: "", // Will be initialized with user's app data directory
  openAI: {
    apiKey: "",
    apiUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
  },
};

// Get app's user data directory using Electron
const getUserDataPath = () => {
  try {
    const { app } = window.require("@electron/remote");
    return app.getPath("userData");
  } catch (error) {
    console.error("Failed to get user data path:", error);
    return "";
  }
};

// Get settings file path
const getSettingsFilePath = () => {
  const userDataPath = getUserDataPath();
  return path.join(userDataPath, "settings.json");
};

// Get data folder path
export const getDataFolderPath = async () => {
  const settings = await getSettings();
  if (settings && settings.dataFolder) {
    return settings.dataFolder;
  }

  // Default to the userData directory if no custom folder is set
  return getUserDataPath();
};

// Get path for a specific data file
export const getDataFilePath = async (filename) => {
  const dataFolder = await getDataFolderPath();
  return path.join(dataFolder, filename);
};

// Load settings from file
export const getSettings = async () => {
  try {
    const settingsPath = getSettingsFilePath();

    // If settings file doesn't exist, create default settings
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        dataFolder: getUserDataPath(), // Initialize with app data directory
      };
      await saveSettings(defaultSettings);
      return defaultSettings;
    }

    // Read and parse settings file
    const data = await fs.promises.readFile(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading settings:", error);
    throw new Error(`Failed to load settings: ${error.message}`);
  }
};

// Save settings to file
export const saveSettings = async (settings) => {
  try {
    const settingsPath = getSettingsFilePath();
    const data = JSON.stringify(settings, null, 2);

    // Create directory if it doesn't exist
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(settingsPath, data, "utf8");
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error(`Failed to save settings: ${error.message}`);
  }
};
