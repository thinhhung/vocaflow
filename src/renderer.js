import React from "react";
import * as ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";

// Import components individually from their files instead of from a directory
import WordPopup from "./components/WordPopup.js";
import VocabularyDashboard from "./components/VocabularyDashboard.js";
import ReadingsList from "./components/ReadingsList.js";
import ReadingForm from "./components/ReadingForm.js";
import ReadingView from "./components/ReadingView.js";
import { SettingsView } from "./components/SettingsView.js";

const App = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-600 text-white p-4">
          <h1 className="text-3xl font-bold">VocaFlow</h1>
          <nav className="mt-2">
            <Link to="/readings" className="mr-4 text-white hover:underline">
              My Readings
            </Link>
            <Link to="/dashboard" className="mr-4 text-white hover:underline">
              Vocabulary Dashboard
            </Link>
            <Link to="/settings" className="text-white hover:underline">
              Settings
            </Link>
          </nav>
        </header>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/readings" />} />
            <Route path="/readings" element={<ReadingsList />} />
            <Route path="/reading/:readingId" element={<ReadingView />} />
            <Route path="/add-reading" element={<ReadingForm />} />
            <Route
              path="/edit-reading/:readingId"
              element={<ReadingForm isEditing={true} />}
            />
            <Route path="/dashboard" element={<VocabularyDashboard />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
