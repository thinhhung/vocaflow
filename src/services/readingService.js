import fs from "fs";
import path from "path";
import { getDataFilePath } from "./settingsService";
const { app } = require("electron");
const crypto = require("crypto");

// File name for storing reading data
const READINGS_FILE = "readings.json";

/**
 * This service combines the functionality of the previous readings-service.js in the root directory
 * with the existing readingService.js in the services folder
 */
class ReadingService {
  constructor() {
    // Path to the readings file in the user's data directory (for main process)
    this.readingsFilePath = app
      ? path.join(app.getPath("userData"), "readings.json")
      : null;
  }

  // Main process methods (from readings-service.js)

  // Initialize readings file if it doesn't exist
  initializeReadingsFile() {
    if (this.readingsFilePath && !fs.existsSync(this.readingsFilePath)) {
      fs.writeFileSync(this.readingsFilePath, JSON.stringify([]));
    }
  }

  // Get all readings (main process)
  getAllReadings() {
    try {
      this.initializeReadingsFile();
      const readingsData = fs.readFileSync(this.readingsFilePath, "utf-8");
      return JSON.parse(readingsData);
    } catch (error) {
      console.error("Error reading readings file:", error);
      return [];
    }
  }

  // Save readings to file (main process)
  saveReadingsToFile(readings) {
    try {
      fs.writeFileSync(
        this.readingsFilePath,
        JSON.stringify(readings, null, 2)
      );
    } catch (error) {
      console.error("Error saving readings:", error);
    }
  }

  // Add a new reading (main process)
  addReading(readingData) {
    try {
      const readings = this.getAllReadings();
      const newReading = {
        ...readingData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      readings.push(newReading);
      this.saveReadingsToFile(readings);
      return newReading;
    } catch (error) {
      console.error("Error adding reading:", error);
      throw error;
    }
  }

  // Update an existing reading (main process)
  updateReading(readingData) {
    try {
      const readings = this.getAllReadings();
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
      this.saveReadingsToFile(readings);
      return updatedReading;
    } catch (error) {
      console.error("Error updating reading:", error);
      throw error;
    }
  }

  // Delete a reading (main process)
  deleteReading(readingId) {
    try {
      let readings = this.getAllReadings();
      const initialLength = readings.length;
      readings = readings.filter((r) => r.id !== readingId);

      if (readings.length === initialLength) {
        throw new Error(`Reading with ID ${readingId} not found`);
      }

      this.saveReadingsToFile(readings);
      return { success: true, id: readingId };
    } catch (error) {
      console.error("Error deleting reading:", error);
      throw error;
    }
  }

  // Renderer process methods (from src/services/readingService.js)

  /**
   * Load all readings from the configured storage location (renderer process)
   *
   * @returns {Promise<Array>} Array of reading objects
   */
  async getAllReadingsFromRenderer() {
    try {
      const filePath = await getDataFilePath(READINGS_FILE);

      if (!fs.existsSync(filePath)) {
        return [];
      }

      const data = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading readings:", error);
      throw new Error(`Failed to load readings: ${error.message}`);
    }
  }

  /**
   * Save a new reading to storage (renderer process)
   *
   * @param {Object} reading - Reading object with title, content, etc.
   * @returns {Promise<Object>} The saved reading with generated ID
   */
  async saveReadingFromRenderer(reading) {
    try {
      const readings = await this.getAllReadingsFromRenderer();

      // Generate a new ID
      const newId =
        readings.length > 0 ? Math.max(...readings.map((r) => r.id)) + 1 : 1;

      const newReading = {
        ...reading,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      readings.push(newReading);

      const filePath = await getDataFilePath(READINGS_FILE);
      const fileDir = path.dirname(filePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(fileDir)) {
        await fs.promises.mkdir(fileDir, { recursive: true });
      }

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(readings, null, 2),
        "utf8"
      );
      return newReading;
    } catch (error) {
      console.error("Error saving reading:", error);
      throw new Error(`Failed to save reading: ${error.message}`);
    }
  }

  /**
   * Get a specific reading by ID (renderer process)
   *
   * @param {number} id - ID of the reading to retrieve
   * @returns {Promise<Object|null>} The reading object or null if not found
   */
  async getReadingById(id) {
    try {
      const readings = await this.getAllReadingsFromRenderer();
      return readings.find((reading) => reading.id === parseInt(id)) || null;
    } catch (error) {
      console.error("Error getting reading by ID:", error);
      throw new Error(`Failed to get reading: ${error.message}`);
    }
  }

  /**
   * Update an existing reading (renderer process)
   *
   * @param {number} id - ID of the reading to update
   * @param {Object} updatedReading - Updated reading data
   * @returns {Promise<Object|null>} The updated reading or null if not found
   */
  async updateReadingFromRenderer(id, updatedReading) {
    try {
      const readings = await this.getAllReadingsFromRenderer();
      const index = readings.findIndex(
        (reading) => reading.id === parseInt(id)
      );

      if (index === -1) {
        return null;
      }

      // Keep the original ID and creation date
      readings[index] = {
        ...updatedReading,
        id: readings[index].id,
        createdAt: readings[index].createdAt,
        updatedAt: new Date().toISOString(),
      };

      const filePath = await getDataFilePath(READINGS_FILE);
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(readings, null, 2),
        "utf8"
      );

      return readings[index];
    } catch (error) {
      console.error("Error updating reading:", error);
      throw new Error(`Failed to update reading: ${error.message}`);
    }
  }

  /**
   * Delete a reading by ID (renderer process)
   *
   * @param {number} id - ID of the reading to delete
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteReadingFromRenderer(id) {
    try {
      const readings = await this.getAllReadingsFromRenderer();
      const filteredReadings = readings.filter(
        (reading) => reading.id !== parseInt(id)
      );

      if (filteredReadings.length === readings.length) {
        // No reading was removed
        return false;
      }

      const filePath = await getDataFilePath(READINGS_FILE);
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(filteredReadings, null, 2),
        "utf8"
      );

      return true;
    } catch (error) {
      console.error("Error deleting reading:", error);
      throw new Error(`Failed to delete reading: ${error.message}`);
    }
  }
}

// Create a singleton instance
const readingService = new ReadingService();

// Export for renderer process (named exports for ES modules)
export const {
  getAllReadingsFromRenderer,
  saveReadingFromRenderer,
  getReadingById,
  updateReadingFromRenderer,
  deleteReadingFromRenderer,
} = readingService;

// For CommonJS require in main process
module.exports = readingService;
