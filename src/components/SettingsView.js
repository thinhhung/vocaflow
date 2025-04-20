import React, { useState, useEffect } from "react";
import { Container, Form, Button, Card, Alert } from "react-bootstrap";
import { getSettings, saveSettings } from "../services/settingsService";

export const SettingsView = () => {
  const [settings, setSettings] = useState({
    dataFolder: "",
    openAI: {
      apiKey: "",
      apiUrl: "https://api.openai.com/v1",
      model: "gpt-3.5-turbo",
    },
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  // Available model options
  const modelOptions = [
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  ];

  useEffect(() => {
    // Load saved settings on component mount
    const loadSavedSettings = async () => {
      try {
        const savedSettings = await getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
        }
      } catch (error) {
        setMessage({
          text: `Error loading settings: ${error.message}`,
          type: "danger",
        });
      }
    };

    loadSavedSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("openAI.")) {
      const field = name.split(".")[1];
      setSettings({
        ...settings,
        openAI: {
          ...settings.openAI,
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
      // Use Electron's dialog to select a directory
      const { dialog } = window.require("@electron/remote");
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select Folder for VocaFlow Data",
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setSettings({
          ...settings,
          dataFolder: result.filePaths[0],
        });
      }
    } catch (error) {
      setMessage({
        text: `Error selecting folder: ${error.message}`,
        type: "danger",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveSettings(settings);
      setMessage({
        text: "Settings saved successfully!",
        type: "success",
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 3000);
    } catch (error) {
      setMessage({
        text: `Error saving settings: ${error.message}`,
        type: "danger",
      });
    }
  };

  return (
    <Container className="my-4">
      <h2>Application Settings</h2>

      {message.text && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage({ text: "", type: "" })}
        >
          {message.text}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Header>Data Storage</Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Data Storage Folder</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="text"
                  name="dataFolder"
                  value={settings.dataFolder}
                  onChange={handleInputChange}
                  placeholder="Select data folder"
                  readOnly
                  className="me-2"
                />
                <Button variant="secondary" onClick={selectDataFolder}>
                  Browse...
                </Button>
              </div>
              <Form.Text className="text-muted">
                Location where vocabulary and progress data will be stored.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header>OpenAI Integration</Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>API Key</Form.Label>
              <Form.Control
                type="password"
                name="openAI.apiKey"
                value={settings.openAI.apiKey}
                onChange={handleInputChange}
                placeholder="Enter your OpenAI API key"
              />
              <Form.Text className="text-muted">
                Your OpenAI API key will be stored securely.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>API URL</Form.Label>
              <Form.Control
                type="text"
                name="openAI.apiUrl"
                value={settings.openAI.apiUrl}
                onChange={handleInputChange}
                placeholder="https://api.openai.com/v1"
              />
              <Form.Text className="text-muted">
                Change this only if you're using a custom OpenAI-compatible API
                endpoint.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Model</Form.Label>
              <Form.Select
                name="openAI.model"
                value={settings.openAI.model}
                onChange={handleInputChange}
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select the OpenAI model to use for vocabulary assistance.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit">
            Save Settings
          </Button>
        </div>
      </Form>
    </Container>
  );
};
