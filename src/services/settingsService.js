// settingsService.js - Simple settings management

// Default settings
const DEFAULT_SETTINGS = {
  dataFolder: "", // Will be initialized with user's app data directory
  provider: "openAI", // Default provider
  openAI: {
    apiKey: "",
    apiUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
    models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
  },
  groq: {
    apiKey: "",
    apiUrl: "https://api.groq.com/v1",
    model: "llama3-8b-8192",
    models: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"],
  },
};

// Simplified functions to avoid IPC serialization issues

// Get app's user data directory using Electron
const getUserDataPath = async () => {
  try {
    return await window.electronAPI.getPath("userData");
  } catch (error) {
    console.error("Failed to get user data path:", error);
    return "";
  }
};

// Get settings file path
const getSettingsFilePath = async () => {
  const userDataPath = await getUserDataPath();
  try {
    return await window.electronAPI.joinPath(userDataPath, "settings.json");
  } catch (error) {
    console.error("Error joining paths:", error);
    return userDataPath + "/settings.json";
  }
};

// Get data folder path
export const getDataFolderPath = async () => {
  try {
    const settings = await getSettings();
    return settings?.dataFolder || (await getUserDataPath());
  } catch (error) {
    console.error("Error getting data folder path:", error);
    return await getUserDataPath();
  }
};

// Get path for a specific data file
export const getDataFilePath = async (filename) => {
  const dataFolder = await getDataFolderPath();
  try {
    return await window.electronAPI.joinPath(dataFolder, filename);
  } catch (error) {
    console.error("Error joining paths for data file:", error);
    return dataFolder + "/" + filename;
  }
};

// Load settings from file
export const getSettings = async () => {
  try {
    // Get settings file path
    const settingsPath = await getSettingsFilePath();

    // Check if file exists
    let fileExists = false;
    try {
      fileExists = await window.electronAPI.fileExists(settingsPath);
    } catch (error) {
      console.error("Error checking if settings file exists:", error);
    }

    if (!fileExists) {
      // File doesn't exist, return default settings
      const userDataPath = await getUserDataPath();
      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        dataFolder: userDataPath,
      };

      // Try to save default settings, but don't block on it
      try {
        await saveSettings(defaultSettings);
      } catch (saveError) {
        console.error("Error saving default settings:", saveError);
      }

      return defaultSettings;
    }

    // Read the settings file
    try {
      const fileContent = await window.electronAPI.readFile(
        settingsPath,
        "utf8"
      );
      return JSON.parse(fileContent);
    } catch (readError) {
      console.error("Error reading settings file:", readError);
      return {
        ...DEFAULT_SETTINGS,
        dataFolder: await getUserDataPath(),
      };
    }
  } catch (error) {
    console.error("Error in getSettings:", error);
    // Return default settings as fallback
    return {
      ...DEFAULT_SETTINGS,
      dataFolder: await getUserDataPath(),
    };
  }
};

// Save settings to file
export const saveSettings = async (settings) => {
  try {
    // Create a clean, serializable settings object
    const cleanSettings = {
      dataFolder: settings?.dataFolder || (await getUserDataPath()),
      provider: settings?.provider || "openAI",
      openAI: {
        apiKey: settings?.openAI?.apiKey || "",
        apiUrl: settings?.openAI?.apiUrl || "https://api.openai.com/v1",
        model: settings?.openAI?.model || "gpt-3.5-turbo",
        models: settings?.openAI?.models || DEFAULT_SETTINGS.openAI.models,
      },
      groq: {
        apiKey: settings?.groq?.apiKey || "",
        apiUrl: settings?.groq?.apiUrl || "https://api.groq.com/v1",
        model: settings?.groq?.model || "llama3-8b-8192",
        models: settings?.groq?.models || DEFAULT_SETTINGS.groq.models,
      },
    };

    const settingsPath = await getSettingsFilePath();

    // Make sure data is properly serialized
    const data = JSON.stringify(cleanSettings);

    // Ensure the directory exists
    try {
      const dir = await window.electronAPI.getDirname(settingsPath);
      const dirExists = await window.electronAPI.fileExists(dir);
      if (!dirExists) {
        await window.electronAPI.createDirectory(dir, { recursive: true });
      }
    } catch (dirError) {
      console.error("Error with directory operations:", dirError);
    }

    // Write the file
    await window.electronAPI.writeFile(settingsPath, data, "utf8");
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
};
