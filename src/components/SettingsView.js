import React, { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../services/settingsService.js";

export const SettingsView = () => {
  // Create safe initial state with all required properties
  const [settings, setSettings] = useState({
    dataFolder: "",
    provider: "openAI",
    openAI: {
      apiKey: "",
      apiUrl: "https://api.openai.com/v1",
      model: "gpt-3.5-turbo",
      models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
    },
    groq: {
      apiKey: "",
      apiUrl: "https://api.groq.com/openai/v1",
      model: "llama3-8b-8192",
      models: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"],
    },
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  // Provider options
  const providerOptions = [
    { id: "openAI", name: "OpenAI" },
    { id: "groq", name: "Groq" },
  ];

  // Get model options based on selected provider
  const getModelOptions = (provider) => {
    const models = settings[provider]?.models || [];
    return models.map((modelId) => ({
      id: modelId,
      name: modelId,
    }));
  };

  useEffect(() => {
    // Load saved settings on component mount
    const loadSavedSettings = async () => {
      try {
        const savedSettings = await getSettings();
        if (savedSettings) {
          // Ensure all required nested objects exist to prevent undefined errors
          const safeSettings = {
            ...settings, // Start with our default settings
            ...savedSettings, // Apply saved settings
            // Ensure provider objects exist
            openAI: {
              ...settings.openAI,
              ...(savedSettings.openAI || {}),
            },
            groq: {
              ...settings.groq,
              ...(savedSettings.groq || {}),
            },
          };
          setSettings(safeSettings);
        }
      } catch (error) {
        setMessage({
          text: `Error loading settings: ${error.message || "Unknown error"}`,
          type: "error",
        });
      }
    };

    loadSavedSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "provider") {
      setSettings({
        ...settings,
        provider: value,
      });
      return;
    }

    if (name.startsWith("openAI.")) {
      const field = name.split(".")[1];
      setSettings({
        ...settings,
        openAI: {
          ...settings.openAI,
          [field]: value,
        },
      });
    } else if (name.startsWith("groq.")) {
      const field = name.split(".")[1];
      setSettings({
        ...settings,
        groq: {
          ...settings.groq,
          [field]: value,
        },
      });
    } else {
      setSettings({
        ...settings,
        [name]: value,
      });
    }
  };

  const selectDataFolder = async () => {
    try {
      // Use the electronAPI.selectFolder method to open the native dialog
      const result = await window.electronAPI.selectFolder();

      if (!result.canceled && result.filePaths.length > 0) {
        setSettings({
          ...settings,
          dataFolder: result.filePaths[0],
        });
      }
    } catch (error) {
      setMessage({
        text: `Error selecting folder: ${error.message}`,
        type: "error",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await saveSettings(settings);

    if (success) {
      setMessage({
        text: "Settings saved successfully!",
        type: "success",
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 3000);
    } else {
      setMessage({
        text: "Failed to save settings. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Application Settings</h2>

      {message.text && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <div className="flex justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage({ text: "", type: "" })}>
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
            Data Storage
          </h3>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="dataFolder">
              Data Storage Folder
            </label>
            <div className="flex">
              <input
                type="text"
                id="dataFolder"
                name="dataFolder"
                value={settings.dataFolder}
                onChange={handleInputChange}
                placeholder="Select data folder"
                readOnly
                className="w-full p-2 border rounded-l"
              />
              <button
                type="button"
                onClick={selectDataFolder}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-r"
              >
                Browse...
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Location where vocabulary and progress data will be stored.
            </p>
          </div>
        </div>

        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
            AI Provider Settings
          </h3>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="provider">
              AI Provider
            </label>
            <select
              id="provider"
              name="provider"
              value={settings.provider}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select which AI provider to use for vocabulary assistance.
            </p>
          </div>

          {settings.provider === "openAI" && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">OpenAI Settings</h4>
              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="openAI.apiKey"
                >
                  API Key
                </label>
                <input
                  type="password"
                  id="openAI.apiKey"
                  name="openAI.apiKey"
                  value={settings.openAI?.apiKey || ""}
                  onChange={handleInputChange}
                  placeholder="Enter your OpenAI API key"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your OpenAI API key will be stored securely.
                </p>
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="openAI.apiUrl"
                >
                  API URL
                </label>
                <input
                  type="text"
                  id="openAI.apiUrl"
                  name="openAI.apiUrl"
                  value={settings.openAI?.apiUrl || ""}
                  onChange={handleInputChange}
                  placeholder="https://api.openai.com/v1"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Change this only if you're using a custom OpenAI-compatible
                  API endpoint.
                </p>
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="openAI.model"
                >
                  Model
                </label>
                <select
                  id="openAI.model"
                  name="openAI.model"
                  value={settings.openAI?.model || ""}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  {getModelOptions("openAI").map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Select the OpenAI model to use for vocabulary assistance.
                </p>
              </div>
            </div>
          )}

          {settings.provider === "groq" && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">Groq Settings</h4>
              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="groq.apiKey"
                >
                  API Key
                </label>
                <input
                  type="password"
                  id="groq.apiKey"
                  name="groq.apiKey"
                  value={settings.groq?.apiKey || ""}
                  onChange={handleInputChange}
                  placeholder="Enter your Groq API key"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your Groq API key will be stored securely.
                </p>
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="groq.apiUrl"
                >
                  API URL
                </label>
                <input
                  type="text"
                  id="groq.apiUrl"
                  name="groq.apiUrl"
                  value={settings.groq?.apiUrl || ""}
                  onChange={handleInputChange}
                  placeholder="https://api.groq.com/v1"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Change this only if needed for custom Groq API endpoint.
                </p>
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 mb-2"
                  htmlFor="groq.model"
                >
                  Model
                </label>
                <select
                  id="groq.model"
                  name="groq.model"
                  value={settings.groq?.model || ""}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  {getModelOptions("groq").map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Select the Groq model to use for vocabulary assistance.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
