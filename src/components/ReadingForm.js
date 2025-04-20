import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

export const ReadingForm = ({ isEditing = false }) => {
  const navigate = useNavigate();
  const { readingId } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isEditing && readingId) {
      const loadReading = async () => {
        try {
          const readings = await window.electronAPI.getReadings();
          const reading = readings.find((r) => r.id === readingId);

          if (reading) {
            setTitle(reading.title);
            setContent(reading.content);
            setSource(reading.source || "");
          } else {
            setError("Reading not found");
          }

          setLoading(false);
        } catch (error) {
          console.error("Error loading reading:", error);
          setError("Failed to load reading");
          setLoading(false);
        }
      };

      loadReading();
    }
  }, [isEditing, readingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      const readingData = {
        title,
        content,
        source: source.trim() || "Manual entry",
      };

      if (isEditing) {
        readingData.id = readingId;
        await window.electronAPI.updateReading(readingData);
      } else {
        await window.electronAPI.saveReading(readingData);
      }

      navigate("/readings");
    } catch (error) {
      console.error("Error saving reading:", error);
      setError("Failed to save reading");
    }
  };

  const handleCancel = () => {
    navigate("/readings");
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">
        {isEditing ? "Edit Reading" : "Add New Reading"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="title">
            Title:
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter a title for this reading"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="source">
            Source (optional):
          </label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Website URL, book, etc."
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700" htmlFor="content">
              Content:
            </label>
            <button
              type="button"
              onClick={togglePreview}
              className="text-blue-500 hover:text-blue-700"
            >
              {previewMode ? "Edit Mode" : "Preview Mode"}
            </button>
          </div>

          {previewMode ? (
            <div className="border rounded p-4 prose max-w-none min-h-[300px] bg-white">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border rounded h-64 font-mono"
              placeholder="Enter the reading content (markdown is supported)"
            />
          )}

          <p className="text-sm text-gray-500 mt-2">
            Markdown formatting is supported (headers, bold, italic, lists,
            etc.)
          </p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isEditing ? "Update Reading" : "Save Reading"}
          </button>
        </div>
      </form>
    </div>
  );
};
