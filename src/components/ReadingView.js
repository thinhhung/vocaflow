import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { WordPopup } from "./WordPopup";
import ReactMarkdown from "react-markdown";

export const ReadingView = () => {
  const { readingId } = useParams();
  const navigate = useNavigate();
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    const loadVocabularyAndReadings = async () => {
      try {
        console.log("Loading vocabulary from API...");
        const vocab = await window.electronAPI.getVocabulary();
        console.log(`Loaded ${vocab.length} vocabulary words`);

        if (vocab.length > 0) {
          console.log("Sample vocabulary:", vocab.slice(0, 5));
        }

        setVocabulary(vocab);

        const readings = await window.electronAPI.getReadings();
        const foundReading = readings.find((r) => r.id === readingId);

        if (foundReading) {
          setReading(foundReading);
          setLoading(false);
        } else {
          setError("Reading not found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load reading");
        setLoading(false);
      }
    };

    loadVocabularyAndReadings();

    const hotReloadListener = () => {
      console.log("Hot reload triggered, refreshing data...");
      loadVocabularyAndReadings();
    };

    window.addEventListener("hot-reload", hotReloadListener);

    const isDev = process.env.NODE_ENV === "development";
    let intervalId;

    if (isDev) {
      intervalId = setInterval(loadVocabularyAndReadings, 5000);
    }

    return () => {
      window.removeEventListener("hot-reload", hotReloadListener);
      if (intervalId) clearInterval(intervalId);
    };
  }, [readingId]);

  useEffect(() => {
    window.selectedWordHandler = (word) => {
      setSelectedWord(word);
    };
    return () => {
      delete window.selectedWordHandler;
    };
  }, []);

  useEffect(() => {
    console.log("Vocabulary changed, refreshing view");
    setForceUpdateKey((prev) => prev + 1);
  }, [vocabulary]);

  const getWordLevel = (word) => {
    if (!word || word.length < 2) return null;

    const normalizedWord = word.toLowerCase();
    const vocabEntry = vocabulary.find(
      (v) => v.word && v.word.toLowerCase() === normalizedWord
    );

    return vocabEntry ? vocabEntry.level : null;
  };

  const processWords = (text) => {
    if (!text || typeof text !== "string") return text;

    const words = text.split(/(\s+)/);

    return words
      .map((word, i) => {
        if (/^\s+$/.test(word)) {
          return word;
        }

        const cleanWord = word.replace(/[.,;:!?()[\]{}""''*_`~#]/g, "");
        if (!cleanWord || cleanWord.length < 2) {
          return word;
        }

        const level = getWordLevel(cleanWord);

        let style = "";
        if (level === "hard") {
          style =
            "background-color:#fee2e2;color:#991b1b;padding:0 2px;border-radius:3px;";
        } else if (level === "familiar") {
          style =
            "background-color:#ffedd5;color:#9a3412;padding:0 2px;border-radius:3px;";
        } else if (level === "known") {
          style =
            "background-color:#dcfce7;color:#166534;padding:0 2px;border-radius:3px;";
        }

        return `<span 
          class="vocab-word" 
          data-word="${cleanWord}" 
          data-level="${level || "unknown"}" 
          style="${style}"
          onclick="window.handleWordClick('${cleanWord}')"
        >${word}</span>`;
      })
      .join("");
  };

  useEffect(() => {
    window.handleWordClick = (word) => {
      setSelectedWord(word);
    };
    return () => {
      delete window.handleWordClick;
    };
  }, []);

  const customRenderers = {
    p: ({ node, ...props }) => {
      const content = props.children || "";
      let processedContent;

      if (typeof content === "string") {
        processedContent = processWords(content);
        return (
          <p
            className="my-4"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      if (Array.isArray(content)) {
        processedContent = content.map((item, i) => {
          if (typeof item === "string") {
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: processWords(item) }}
              />
            );
          }
          return item;
        });
        return <p className="my-4">{processedContent}</p>;
      }

      return <p className="my-4" {...props} />;
    },

    text: ({ children }) => {
      if (!children || typeof children !== "string" || children.trim() === "") {
        return children;
      }

      const processedHtml = processWords(children);
      return <span dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    },

    h1: ({ node, ...props }) => (
      <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="text-lg font-bold mt-3 mb-2" {...props} />
    ),
    h5: ({ node, ...props }) => (
      <h5 className="text-base font-bold mt-3 mb-1" {...props} />
    ),
    h6: ({ node, ...props }) => (
      <h6 className="text-sm font-bold mt-3 mb-1" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-5 my-4" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-5 my-4" {...props} />
    ),
    li: ({ node, ...props }) => <li className="ml-2 mb-1" {...props} />,
    a: ({ node, ...props }) => (
      <a className="text-blue-500 hover:underline" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-4 border-gray-200 pl-4 italic my-4"
        {...props}
      />
    ),
    code: ({ node, inline, className, children, ...props }) => {
      if (inline || (!className && String(children).indexOf("\n") === -1)) {
        return (
          <code
            className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono inline"
            {...props}
          >
            {children}
          </code>
        );
      }

      const match = /language-(\w+)/.exec(className || "");
      return (
        <pre className="bg-gray-100 rounded p-4 overflow-x-auto my-4">
          <code
            className={`${
              match ? `language-${match[1]}` : ""
            } block whitespace-pre-wrap`}
            {...props}
          >
            {children}
          </code>
        </pre>
      );
    },
  };

  const refreshVocabulary = async () => {
    console.log("Refreshing vocabulary from API...");
    const freshVocabulary = await window.electronAPI.getVocabulary();
    console.log(`Loaded ${freshVocabulary.length} vocab words`);

    setVocabulary(freshVocabulary);
    setForceUpdateKey(Date.now());
  };

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
        phoneticSpelling: wordDetails.phoneticSpelling || "",
        level,
        lastReviewed: new Date().toISOString(),
        idioms: wordDetails.idioms || [],
        pronunciations: wordDetails.pronunciations || [],
      };

      const savedWord = await window.electronAPI.saveWord(wordData);
      console.log(`Word saved: "${word}" with level: ${level}`);

      await refreshVocabulary();

      setSelectedWord(null);
    } catch (error) {
      console.error("Error saving word:", error);
    }
  };

  const handleBackClick = () => {
    navigate("/readings");
  };

  const handleEditClick = () => {
    navigate(`/edit-reading/${readingId}`);
  };

  const renderDebugTools = () => {
    if (process.env.NODE_ENV !== "development") return null;

    return (
      <div className="mt-2 p-2 border border-gray-300 rounded">
        <h4 className="text-sm font-bold">Debug Tools</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={refreshVocabulary}
            className="px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded text-sm"
          >
            Refresh Vocabulary
          </button>
          <button
            onClick={() => setForceUpdateKey((prev) => prev + 1)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Force Render
          </button>
          <button
            onClick={() => console.log("Current vocabulary:", vocabulary)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Log Vocabulary
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error || !reading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "Reading not found"}
        </div>
        <div className="mt-4">
          <button
            onClick={handleBackClick}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Readings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleBackClick}
          className="text-blue-500 hover:text-blue-700 flex items-center"
        >
          ← Back to Readings
        </button>
        <button
          onClick={handleEditClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit Reading
        </button>
      </div>

      {process.env.NODE_ENV === "development" && renderDebugTools()}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{reading.title}</h1>
          <p className="text-gray-500 mb-4">
            {reading.source && `Source: ${reading.source}`}
            {reading.source && " • "}
            Last updated: {new Date(reading.updatedAt).toLocaleDateString()}
          </p>

          <div className="prose max-w-none text-content" ref={contentRef}>
            <ReactMarkdown
              components={customRenderers}
              key={`markdown-${readingId}-${forceUpdateKey}`}
              skipHtml={false}
              unwrapDisallowed={false}
            >
              {reading.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {selectedWord && (
        <WordPopup
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onSave={handleSaveWord}
        />
      )}
    </div>
  );
};
