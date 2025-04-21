import { app } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReadingService {
  constructor() {
    this.readingsFilePath = null;

    // Initialize the path when Electron app is available
    if (app) {
      try {
        this.readingsFilePath = path.join(
          app.getPath("userData"),
          "readings.json"
        );
        this.initializeReadingsFile();
      } catch (error) {
        console.error("Error initializing readings file path:", error);
      }
    }
  }

  initializeReadingsFile() {
    try {
      if (!this.readingsFilePath) {
        throw new Error("Readings file path is not defined");
      }

      if (!fs.existsSync(this.readingsFilePath)) {
        const userDataDir = path.dirname(this.readingsFilePath);
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        fs.writeFileSync(this.readingsFilePath, JSON.stringify([]));
        console.log("Created new readings file at:", this.readingsFilePath);
      }
    } catch (error) {
      console.error("Error initializing readings file:", error);
    }
  }

  getAllReadings() {
    try {
      if (!this.readingsFilePath) {
        throw new Error("Readings file path is not defined");
      }

      const data = fs.readFileSync(this.readingsFilePath, "utf-8");
      return JSON.parse(data || "[]");
    } catch (error) {
      console.error("Error reading readings file:", error);
      return [];
    }
  }

  saveReadingsToFile(readings) {
    try {
      if (!this.readingsFilePath) {
        throw new Error("Readings file path is not defined");
      }

      fs.writeFileSync(
        this.readingsFilePath,
        JSON.stringify(readings, null, 2)
      );
    } catch (error) {
      console.error("Error saving readings:", error);
      throw error;
    }
  }

  addReading(readingData) {
    try {
      const readings = this.getAllReadings();
      const newReading = {
        ...readingData,
        id: uuidv4(),
        dateAdded: new Date().toISOString(),
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

  updateReading(readingData) {
    try {
      const readings = this.getAllReadings();
      const index = readings.findIndex(
        (reading) => reading.id === readingData.id
      );

      if (index !== -1) {
        readings[index] = {
          ...readings[index],
          ...readingData,
          updatedAt: new Date().toISOString(),
        };

        this.saveReadingsToFile(readings);
        return readings[index];
      }

      throw new Error("Reading not found");
    } catch (error) {
      console.error("Error updating reading:", error);
      throw error;
    }
  }

  deleteReading(readingId) {
    try {
      let readings = this.getAllReadings();
      readings = readings.filter((reading) => reading.id !== readingId);

      this.saveReadingsToFile(readings);
      return { success: true, id: readingId };
    } catch (error) {
      console.error("Error deleting reading:", error);
      throw error;
    }
  }

  getReading(readingId) {
    try {
      const readings = this.getAllReadings();
      const reading = readings.find((r) => r.id === readingId);

      if (!reading) {
        throw new Error("Reading not found");
      }

      return reading;
    } catch (error) {
      console.error("Error getting reading:", error);
      throw error;
    }
  }
}

const readingService = new ReadingService();
export { readingService };
