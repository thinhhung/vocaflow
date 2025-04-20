const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Path to the readings file in the user's data directory
const readingsFilePath = path.join(app.getPath("userData"), "readings.json");

// Initialize readings file if it doesn't exist
function initializeReadingsFile() {
  if (!fs.existsSync(readingsFilePath)) {
    fs.writeFileSync(readingsFilePath, JSON.stringify([]));
  }
}

// Get all readings
function getAllReadings() {
  try {
    initializeReadingsFile();
    const readingsData = fs.readFileSync(readingsFilePath, "utf-8");
    return JSON.parse(readingsData);
  } catch (error) {
    console.error("Error reading readings file:", error);
    return [];
  }
}

// Save readings to file
function saveReadingsToFile(readings) {
  try {
    fs.writeFileSync(readingsFilePath, JSON.stringify(readings, null, 2));
  } catch (error) {
    console.error("Error saving readings:", error);
  }
}

// Add a new reading
function addReading(readingData) {
  try {
    const readings = getAllReadings();
    const newReading = {
      ...readingData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    readings.push(newReading);
    saveReadingsToFile(readings);
    return newReading;
  } catch (error) {
    console.error("Error adding reading:", error);
    throw error;
  }
}

// Update an existing reading
function updateReading(readingData) {
  try {
    const readings = getAllReadings();
    const index = readings.findIndex((r) => r.id === readingData.id);

    if (index === -1) {
      throw new Error(`Reading with ID ${readingData.id} not found`);
    }

    const updatedReading = {
      ...readings[index],
      ...readingData,
      updatedAt: new Date().toISOString(),
    };

    readings[index] = updatedReading;
    saveReadingsToFile(readings);
    return updatedReading;
  } catch (error) {
    console.error("Error updating reading:", error);
    throw error;
  }
}

// Delete a reading
function deleteReading(readingId) {
  try {
    let readings = getAllReadings();
    const initialLength = readings.length;
    readings = readings.filter((r) => r.id !== readingId);

    if (readings.length === initialLength) {
      throw new Error(`Reading with ID ${readingId} not found`);
    }

    saveReadingsToFile(readings);
    return { success: true, id: readingId };
  } catch (error) {
    console.error("Error deleting reading:", error);
    throw error;
  }
}

// Export the functions
module.exports = {
  getAllReadings,
  addReading,
  updateReading,
  deleteReading,
};
