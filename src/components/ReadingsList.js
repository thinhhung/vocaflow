import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import WordPopup from "./WordPopup.js";

const ReadingsList = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewReadingId, setPreviewReadingId] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const previewRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedReadings, vocab] = await Promise.all([
          window.electronAPI.getAllReadings(),
          window.electronAPI.getAllVocabulary(),
        ]);
        setReadings(loadedReadings);
        setVocabulary(vocab);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Readings List Functions
  const handleReadingClick = (readingId) => {
    navigate(`/reading/${readingId}`);
  };

  const handleDeleteReading = async (e, readingId) => {
    e.stopPropagation();

    if (window.confirm("Are you sure you want to delete this reading?")) {
      try {
        await window.electronAPI.deleteReading(readingId);
        setReadings(readings.filter((reading) => reading.id !== readingId));
      } catch (error) {
        console.error("Error deleting reading:", error);
      }
    }
  };

  const handleEditReading = (e, readingId) => {
    e.stopPropagation();
    navigate(`/edit-reading/${readingId}`);
  };

  const handleAddReading = () => {
    navigate("/add-reading");
  };

  const togglePreview = (e, readingId) => {
    e.stopPropagation();
    if (previewReadingId === readingId) {
      setPreviewReadingId(null);
    } else {
      setPreviewReadingId(readingId);
    }
  };

  // Handle word click in preview
  useEffect(() => {
    if (previewReadingId) {
      const previewElement = previewRefs.current[previewReadingId];
      if (!previewElement) return;

      const handleWordClick = (e) => {
        // Only process direct clicks on span elements or text nodes
        if (e.target.nodeName === "SPAN" && e.target.dataset.word) {
          e.stopPropagation();
          setSelectedWord(e.target.dataset.word);
        } else if (
          e.target.nodeType === Node.TEXT_NODE ||
          !["A", "BUTTON", "INPUT"].includes(e.target.tagName)
        ) {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (!range) return;

          // Extract the word at the clicked position
          const text = range.startContainer.textContent;
          let startPos = range.startOffset;
          let endPos = range.startOffset;

          // Find word boundaries
          while (startPos > 0 && !/\s/.test(text[startPos - 1])) {
            startPos--;
          }

          while (endPos < text.length && !/\s/.test(text[endPos])) {
            endPos++;
          }

          const clickedWord = text
            .substring(startPos, endPos)
            .trim()
            .replace(/[.,;:!?()[\]{}""''*_`~#]/g, "");

          if (clickedWord && clickedWord.length > 1) {
            e.stopPropagation();
            setSelectedWord(clickedWord);
          }
        }
      };

      previewElement.addEventListener("click", handleWordClick);

      return () => {
        if (previewElement) {
          previewElement.removeEventListener("click", handleWordClick);
        }
      };
    }
  }, [previewReadingId]);

  const handleSaveWord = async (word, level) => {
    try {
      const wordDetails = await window.electronAPI.lookupWord(word);

      const wordData = {
        word,
        partOfSpeech: wordDetails.partOfSpeech || "",
        definition: wordDetails.definitions
          ? wordDetails.definitions.join("; ")
          : "",
        exampleSentences: wordDetails.examples || [],
        level,
      };

      const savedWord = await window.electronAPI.saveWord(wordData);

      setVocabulary((prev) => {
        const exists = prev.findIndex((item) => item.word === word);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = savedWord;
          return updated;
        } else {
          return [...prev, savedWord];
        }
      });

      setSelectedWord(null);
    } catch (error) {
      console.error("Error saving word:", error);
    }
  };

  const getWordLevel = (word) => {
    if (!word || word.length <= 1) return "default";

    // Skip URLs or emails
    if (word.includes("://") || word.includes("@") || word.includes(".com")) {
      return "default";
    }

    const vocabEntry = vocabulary.find(
      (v) => v.word && v.word.toLowerCase() === word.toLowerCase()
    );
    return vocabEntry ? vocabEntry.level : "default";
  };

  // Custom renderer for words in markdown
  const customRenderers = {
    text: ({ children }) => {
      if (!children || typeof children !== "string") return null;

      // Split text into words
      const words = children.split(/(\s+)/);

      return (
        <>
          {words.map((word, i) => {
            // Preserve spaces
            if (/^\s+$/.test(word)) return word;

            // Clean the word for lookup
            const cleanWord = word.replace(/[.,;:!?()[\]{}""''*_`~#]/g, "");
            if (!cleanWord) return word;

            // Get word level from vocabulary
            const wordLevel = getWordLevel(cleanWord);

            // Color based on level
            let colorClass;
            switch (wordLevel) {
              case "hard":
                colorClass = "text-red-500";
                break;
              case "familiar":
                colorClass = "text-orange-500";
                break;
              case "known":
                colorClass = "text-green-500";
                break;
              default:
                colorClass = "";
            }

            return (
              <span
                key={i}
                className={`${
                  colorClass ? colorClass : ""
                } cursor-pointer hover:underline`}
                data-word={cleanWord}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWord(cleanWord);
                }}
              >
                {word}
              </span>
            );
          })}
        </>
      );
    },
  };

  // Helper to ensure content is a string
  const ensureString = (content) => {
    if (typeof content === "string") return content;
    if (content === null || content === undefined) return "";
    return String(content); // Convert to string
  };

  // Render Reading List
  const renderReadingList = () => (
    <>
      {readings.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">You don't have any readings yet.</p>
          <button
            onClick={handleAddReading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Your First Reading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readings.map((reading) => (
            <div
              key={reading.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleReadingClick(reading.id)}
            >
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-1">{reading.title}</h3>
                <p className="text-gray-500 text-sm mb-2">
                  {new Date(
                    reading.updatedAt || reading.dateAdded
                  ).toLocaleDateString()}{" "}
                  - {reading.source || "No source"}
                </p>

                {previewReadingId === reading.id ? (
                  <div
                    className="prose prose-sm max-w-none"
                    onClick={(e) => e.stopPropagation()}
                    ref={(el) => {
                      previewRefs.current[reading.id] = el;
                    }}
                  >
                    <div className="max-h-60 overflow-y-auto">
                      <ReactMarkdown
                        components={{
                          code: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }) => {
                            return inline ? (
                              <code
                                className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <pre className="bg-gray-100 rounded p-4 overflow-x-auto my-4">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            );
                          },
                          text: customRenderers.text,
                        }}
                      >
                        {ensureString(reading.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-700 line-clamp-3">
                    <ReactMarkdown
                      components={{
                        code: ({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }) => (
                          <code
                            className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {ensureString(reading.content).substring(0, 150) + "..."}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="border-t px-4 py-2 bg-gray-50 flex justify-between">
                <button
                  onClick={(e) => togglePreview(e, reading.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {previewReadingId === reading.id ? "Hide Preview" : "Preview"}
                </button>
                <div>
                  <button
                    onClick={(e) => handleEditReading(e, reading.id)}
                    className="text-blue-500 hover:text-blue-700 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeleteReading(e, reading.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWord && (
        <WordPopup
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onSave={handleSaveWord}
        />
      )}
    </>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Readings</h2>
        <button
          onClick={handleAddReading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add New Reading
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">{renderReadingList()}</div>
      )}
    </div>
  );
};

export default ReadingsList;
