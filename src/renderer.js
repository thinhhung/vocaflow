import React from "react";
import * as ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import {
  WordPopup,
  VocabularyDashboard,
  ReadingsList,
  ReadingForm,
  ReadingView,
} from "./components";

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
            <Link to="/dashboard" className="text-white hover:underline">
              Vocabulary Dashboard
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
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
