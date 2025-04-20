/**
 * Hot reload utility for development
 *
 * This module helps with hot reloading in development environments
 * by dispatching a custom event when changes are detected.
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Setup hot reload for development
if (isDevelopment) {
  console.log("Setting up hot reload for development");

  // Listen for file changes from the electron process
  if (window.electronAPI && window.electronAPI.onFileChange) {
    window.electronAPI.onFileChange((event, data) => {
      console.log("File change detected:", data);
      // Dispatch a custom event that components can listen for
      window.dispatchEvent(new CustomEvent("hot-reload", { detail: data }));
    });
  }

  // Fallback method - periodically check if the page needs reloading
  let lastModified = Date.now();

  setInterval(() => {
    fetch("?checkForChanges=" + Date.now())
      .then((response) => {
        const currentModified = response.headers.get("Last-Modified");
        if (currentModified && new Date(currentModified) > lastModified) {
          lastModified = new Date(currentModified);
          console.log("Changes detected, triggering hot reload");
          window.dispatchEvent(new CustomEvent("hot-reload"));
        }
      })
      .catch((err) => console.log("Hot reload check failed:", err));
  }, 3000);
}

/**
 * Register a component for hot reload
 * @param {Function} callback - Function to call when hot reload is triggered
 * @returns {Function} Cleanup function to unregister the callback
 */
export const useHotReload = (callback) => {
  if (!isDevelopment) return () => {};

  const handler = () => {
    console.log("Hot reload triggered for component");
    callback();
  };

  window.addEventListener("hot-reload", handler);
  return () => window.removeEventListener("hot-reload", handler);
};

export default {
  useHotReload,
};
