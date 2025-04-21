import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WordPopup from "./WordPopup.js"; // Added .js extension
import ReactMarkdown from "react-markdown";

const ReadingView = () => {
  const { readingId } = useParams();
  const navigate = useNavigate();
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const contentRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedPages, setCompletedPages] = useState([]);
  const [wordsInCurrentPage, setWordsInCurrentPage] = useState([]);

  useEffect(() => {
    const loadVocabularyAndReadings = async () => {
      try {
        console.log("Loading vocabulary from API...");
        const vocab = await window.electronAPI.getAllVocabulary();
        console.log(`Loaded ${vocab.length} vocabulary words`);

        if (vocab.length > 0) {
          console.log("Sample vocabulary:", vocab.slice(0, 5));
        }

        setVocabulary(vocab);

        const readings = await window.electronAPI.getAllReadings();
        const foundReading = readings.find((r) => r.id === readingId);

        if (foundReading) {
          setReading(foundReading);
          setLoading(false);

          // Split content into pages if it's longer than a threshold
          const paginated = paginateContent(foundReading.content);
          setTotalPages(paginated.length);

          // Load completed pages from storage
          try {
            const progress = await window.electronAPI.getReadingProgress(
              readingId
            );
            if (progress && progress.completedPages) {
              setCompletedPages(progress.completedPages);
            }
          } catch (err) {
            console.error("Error loading reading progress:", err);
          }
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
    const handleDocumentClick = (e) => {
      const vocabElement = e.target.closest(".vocab-word");

      if (vocabElement) {
        const word = vocabElement.dataset.word;
        if (word) {
          console.log(`Word clicked: "${word}"`);
          setSelectedWord(word);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    console.log("Vocabulary changed, refreshing view");
    setForceUpdateKey((prev) => prev + 1);
  }, [vocabulary]);

  useEffect(() => {
    if (reading && reading.content) {
      const pages = paginateContent(reading.content);
      if (currentPage <= pages.length) {
        const pageContent = pages[currentPage - 1];
        const words = extractWords(pageContent);
        setWordsInCurrentPage(words);
      }
    }
  }, [reading, currentPage]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Arrow Right - Next Page
      if (event.key === "ArrowRight") {
        navigateToPage(currentPage + 1);
      }
      // Arrow Left - Previous Page
      else if (event.key === "ArrowLeft") {
        navigateToPage(currentPage - 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, totalPages]);

  const getWordLevel = (word) => {
    if (!word || word.length < 2) return null;

    const normalizedWord = word.toLowerCase();
    const vocabEntry = vocabulary.find(
      (v) => v.word && v.word.toLowerCase() === normalizedWord
    );

    return vocabEntry ? vocabEntry.level : null;
  };

  const paginateContent = (content) => {
    if (!content) return [""];

    // For shorter content, just return a single page
    if (content.length < 3000) return [content];

    // For longer content, split by markdown headings or paragraph groups
    const pages = [];
    const sections = content.split(/(?=^#{1,2}\s)/m);

    let currentPage = "";
    for (const section of sections) {
      if ((currentPage + section).length > 4000 && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = section;
      } else {
        currentPage += section;
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [content];
  };

  const extractWords = (content) => {
    if (!content) return [];

    // Remove markdown formatting, code blocks, and special characters
    const cleanText = content
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/`[^`]*`/g, "") // Remove inline code
      .replace(/\[.*?\]\(.*?\)/g, "") // Remove links
      .replace(/[#*_~>]/g, "") // Remove formatting chars
      .replace(/[.,;:!?()[\]{}""'']/g, " "); // Replace punctuation with spaces

    // Split into words and filter
    const words = cleanText
      .split(/\s+/)
      .filter((word) => word.length > 1)
      .map((word) => word.toLowerCase())
      .filter((word) => !/^\d+$/.test(word)); // Remove numbers-only items

    // Return unique words
    return [...new Set(words)];
  };

  const markPageAsCompleted = async () => {
    if (completedPages.includes(currentPage)) {
      return; // Already completed
    }

    // Add untracked words to vocabulary
    const untrackedWords = wordsInCurrentPage.filter((word) => {
      const existingWord = vocabulary.find(
        (v) => v.word?.toLowerCase() === word.toLowerCase()
      );
      return !existingWord; // Word is not in vocabulary
    });

    // Add untracked words to vocabulary as "untracked"
    for (const word of untrackedWords) {
      try {
        const wordData = {
          word,
          level: null, // untracked level
          dateAdded: new Date().toISOString(),
        };

        await window.electronAPI.saveWord(wordData);
        console.log(`Added untracked word: ${word}`);
      } catch (err) {
        console.error(`Error adding word ${word}:`, err);
      }
    }

    // Update completed pages
    const updatedCompletedPages = [...completedPages, currentPage];
    setCompletedPages(updatedCompletedPages);

    // Save progress
    try {
      await window.electronAPI.saveReadingProgress(readingId, {
        completedPages: updatedCompletedPages,
        lastPage: currentPage,
        lastAccessed: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error saving reading progress:", err);
    }

    // Refresh vocabulary list
    await refreshVocabulary();
  };

  const navigateToPage = async (pageNum) => {
    // Check if we're at the last page and trying to go forward
    if (pageNum > totalPages) {
      await markPageAsCompleted(); // Mark current page as complete

      // Mark reading as complete in reading progress
      try {
        await window.electronAPI.saveReadingProgress(readingId, {
          completedPages: [...completedPages, currentPage],
          lastPage: currentPage,
          lastAccessed: new Date().toISOString(),
          isCompleted: true,
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error marking reading as complete:", err);
      }

      setShowCompletionModal(true); // Show completion modal
      return;
    }

    // Check if we're at the first page and trying to go back
    if (pageNum < 1) {
      return; // Do nothing
    }

    // Mark current page as complete before moving to next page
    if (pageNum > currentPage) {
      await markPageAsCompleted();
    }

    // Navigate to the page
    setCurrentPage(pageNum);

    // Scroll to top
    window.scrollTo(0, 0);
  };

  const processWords = (text) => {
    if (!text || typeof text !== "string") return text;

    // Check if this is likely a list item that already has a bullet
    const isBulletedText =
      text.trim().startsWith("•") ||
      text.trim().startsWith("-") ||
      text.trim().match(/^\d+\./) !== null;

    // Preserve Markdown headings by protecting # characters at the beginning of lines
    let processedText = text;
    if (text.trim().startsWith("#")) {
      // Replace # at the beginning of lines with a placeholder
      processedText = text.replace(/^(#{1,6})\s+/m, "§HEADING§$1 ");
    }

    // Protect bullet points in list items
    if (isBulletedText) {
      processedText = processedText
        .replace(/^-\s+/m, "§BULLET§- ")
        .replace(/^\*\s+/m, "§BULLET§* ")
        .replace(/^(\d+)\.\s+/m, "§BULLET§$1. ");
    }

    // First, identify and protect hyphenated words
    const tempHyphenMarker = "§HYPHEN§";
    processedText = processedText.replace(
      /(\w+)-(\w+)/g,
      `$1${tempHyphenMarker}$2`
    );

    // Enhanced word split regex that keeps special characters as separate tokens
    const words = processedText.split(/(\s+|\/|\-|–|—|&|\+)/);

    return words
      .map((word, i) => {
        // Restore any special markers
        word = word
          .replace(new RegExp(tempHyphenMarker, "g"), "-")
          .replace(/§HEADING§/, "")
          .replace(/§BULLET§/, "");

        // Check if it's just whitespace or separators
        if (/^[\s\/\-–—&\+]+$/.test(word)) {
          return word;
        }

        // For hyphenated words, clean only the punctuation that isn't the hyphen
        if (word.includes("-") && /\w+-\w+/.test(word)) {
          const cleanWord = word.replace(
            /[.,;:!?()[\]{}""''*_`~#<>\/"–—&\+]/g,
            ""
          );
          if (cleanWord && cleanWord.length >= 2) {
            // Process hyphenated word as a single vocabulary item
            const level = getWordLevel(cleanWord);

            let style = "";
            if (level === "hard") {
              style =
                "background-color:#fee2e2;color:#991b1b;padding:0 2px;border-radius:3px;cursor:pointer;display:inline-block;";
            } else if (level === "familiar") {
              style =
                "background-color:#ffedd5;color:#9a3412;padding:0 2px;border-radius:3px;cursor:pointer;display:inline-block;";
            } else {
              // Known and untracked words have no special styling
              style = "cursor:pointer;display:inline-block;";
            }

            if (debugMode) {
              style += "outline: 1px dashed blue;";
            }

            return `<span 
              class="vocab-word" 
              data-word="${cleanWord}" 
              data-level="${level || "unknown"}" 
              style="${style}"
              role="button"
              tabindex="0"
            >${word}</span>`;
          }
        }

        // Regular word processing for non-hyphenated words
        const cleanWord = word.replace(
          /[.,;:!?()[\]{}""''*_`~#<>\/\-–—&\+]/g,
          ""
        );
        if (!cleanWord || cleanWord.length < 2) {
          return word;
        }

        const level = getWordLevel(cleanWord);

        let style = "";
        if (level === "hard") {
          style =
            "background-color:#fee2e2;color:#991b1b;padding:0 2px;border-radius:3px;cursor:pointer;display:inline-block;";
        } else if (level === "familiar") {
          style =
            "background-color:#ffedd5;color:#9a3412;padding:0 2px;border-radius:3px;cursor:pointer;display:inline-block;";
        } else {
          // Known and untracked words have no special styling
          style = "cursor:pointer;display:inline-block;";
        }

        if (debugMode) {
          style += "outline: 1px dashed blue;";
        }

        return `<span 
          class="vocab-word" 
          data-word="${cleanWord}" 
          data-level="${level || "unknown"}" 
          style="${style}"
          role="button"
          tabindex="0"
        >${word}</span>`;
      })
      .join("");
  };

  const processReactContent = (content) => {
    if (!content) {
      return content;
    }

    if (typeof content === "string") {
      // Process string content directly
      const processedHtml = processWords(content);
      // Return the processed HTML directly without the vocab-text-span wrapper
      return <span dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    }

    if (Array.isArray(content)) {
      // Process each item in array
      return content.map((item, i) => {
        return (
          <React.Fragment key={i}>{processReactContent(item)}</React.Fragment>
        );
      });
    }

    // Handle React elements with their children
    if (content.props && content.props.children) {
      // Special case for React elements that might contain HTML or complex structures
      try {
        const processedChildren = processReactContent(content.props.children);
        return React.cloneElement(content, { children: processedChildren });
      } catch (err) {
        console.error("Error processing content:", err);
        // In case of error, return the original content
        return content;
      }
    }

    // Return unchanged if no special processing needed
    return content;
  };

  const customRenderers = {
    // Process headings to make vocabulary words clickable - using the recursive processor
    h1: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h1
            className="text-3xl font-bold mt-6 mb-4 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h1
            className="text-3xl font-bold mt-6 mb-4 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h1 className="text-3xl font-bold mt-6 mb-4 vocab-heading">
          {processedChildren}
        </h1>
      );
    },

    h2: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h2
            className="text-2xl font-bold mt-5 mb-3 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h2
            className="text-2xl font-bold mt-5 mb-3 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h2 className="text-2xl font-bold mt-5 mb-3 vocab-heading">
          {processedChildren}
        </h2>
      );
    },

    h3: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h3
            className="text-xl font-bold mt-4 mb-2 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h3
            className="text-xl font-bold mt-4 mb-2 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h3 className="text-xl font-bold mt-4 mb-2 vocab-heading">
          {processedChildren}
        </h3>
      );
    },

    h4: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h4
            className="text-lg font-bold mt-3 mb-2 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h4
            className="text-lg font-bold mt-3 mb-2 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h4 className="text-lg font-bold mt-3 mb-2 vocab-heading">
          {processedChildren}
        </h4>
      );
    },

    h5: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h5
            className="text-base font-bold mt-3 mb-1 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h5
            className="text-base font-bold mt-3 mb-1 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h5 className="text-base font-bold mt-3 mb-1 vocab-heading">
          {processedChildren}
        </h5>
      );
    },

    h6: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <h6
            className="text-sm font-bold mt-3 mb-1 vocab-heading"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <h6
            className="text-sm font-bold mt-3 mb-1 vocab-heading"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <h6 className="text-sm font-bold mt-3 mb-1 vocab-heading">
          {processedChildren}
        </h6>
      );
    },

    // Improved paragraph handling
    p: ({ node, children, ...props }) => {
      if (!children) {
        return <p className="my-4 vocab-paragraph" {...props} />;
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <p
            className="my-4 vocab-paragraph"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return <p className="my-4 vocab-paragraph">{processedChildren}</p>;
    },

    // Enhanced list rendering with proper children passing
    ul: ({ node, children, ...props }) => {
      // Check if this is a nested list (parent is a list item)
      const isNested = node.parent && node.parent.tagName === "li";

      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("Rendering UL with children:", children);
      }

      return (
        <ul
          className={`list-disc pl-5 ${isNested ? "my-1" : "my-4"} vocab-ul`}
          {...props}
        >
          {children}
        </ul>
      );
    },

    ol: ({ node, children, ...props }) => {
      const isNested = node.parent && node.parent.tagName === "li";

      return (
        <ol
          className={`list-decimal pl-5 ${isNested ? "my-1" : "my-4"} vocab-ol`}
          {...props}
        >
          {children}
        </ol>
      );
    },

    // Enhanced list item handling that fixes the missing text bug
    li: ({ node, children, ...props }) => {
      // Check if this list item contains a nested list
      const hasNestedList =
        node.children &&
        node.children.some(
          (child) =>
            child.type === "element" &&
            (child.tagName === "ul" || child.tagName === "ol")
        );

      // Debug logging if enabled
      if (process.env.NODE_ENV === "development" && debugMode) {
        console.log("List item node:", node);
      }

      if (!children) {
        return <li className="ml-2 mb-1 vocab-list-item" {...props} />;
      }

      // For list items that have both text and nested lists, ensure we capture all the text
      if (hasNestedList && Array.isArray(children)) {
        // Group text/inline elements and nested list elements separately
        const textElements = [];
        const listElements = [];

        children.forEach((child) => {
          if (typeof child === "string") {
            // Process strings as vocabulary
            const processedHtml = processWords(child);
            textElements.push(
              <span
                key={`text-${textElements.length}`}
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            );
          } else if (
            React.isValidElement(child) &&
            (child.type === "ul" ||
              child.type === "ol" ||
              (child.props &&
                (child.props.className?.includes("vocab-ul") ||
                  child.props.className?.includes("vocab-ol"))))
          ) {
            // Keep list elements separate
            listElements.push(child);
          } else {
            // Other elements like <strong>, <em>, etc.
            textElements.push(child);
          }
        });

        // Render with text first, then the nested list(s)
        return (
          <li
            className={`ml-2 ${
              hasNestedList ? "mb-0" : "mb-1"
            } vocab-list-item`}
          >
            {textElements.length > 0 && (
              <div className="list-text">{textElements}</div>
            )}
            {listElements.map((list, i) => (
              <React.Fragment key={`list-${i}`}>{list}</React.Fragment>
            ))}
          </li>
        );
      }

      // Handle simple string content
      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <li
            className="ml-2 mb-1 vocab-list-item"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // For array children without nested lists
      if (Array.isArray(children)) {
        const processedChildren = children.map((child, i) => {
          if (typeof child === "string") {
            const processedHtml = processWords(child);
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            );
          }
          return <React.Fragment key={i}>{child}</React.Fragment>;
        });

        return (
          <li className="ml-2 mb-1 vocab-list-item">{processedChildren}</li>
        );
      }

      // For non-array children
      return <li className="ml-2 mb-1 vocab-list-item">{children}</li>;
    },

    a: ({ node, ...props }) => (
      <a className="text-blue-500 hover:underline" {...props} />
    ),

    // Enhanced blockquote handling for markdown content
    blockquote: ({ node, children, ...props }) => {
      if (!children) {
        return (
          <blockquote
            className="border-l-4 border-gray-200 pl-4 italic my-4 vocab-blockquote"
            {...props}
          />
        );
      }

      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <blockquote
            className="border-l-4 border-gray-200 pl-4 italic my-4 vocab-blockquote"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      // Process complex content using the recursive processor
      const processedChildren = processReactContent(children);
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4 vocab-blockquote">
          {processedChildren}
        </blockquote>
      );
    },

    // Add special handling for strong and emphasis elements
    strong: ({ node, children, ...props }) => {
      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <strong
            className="font-bold vocab-strong"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      const processedChildren = processReactContent(children);
      return (
        <strong className="font-bold vocab-strong">{processedChildren}</strong>
      );
    },

    em: ({ node, children, ...props }) => {
      if (typeof children === "string") {
        const processedContent = processWords(children);
        return (
          <em
            className="italic vocab-em"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }

      const processedChildren = processReactContent(children);
      return <em className="italic vocab-em">{processedChildren}</em>;
    },

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

    // Process text content with additional checks
    text: ({ node, children }) => {
      if (!children || typeof children !== "string" || children.trim() === "") {
        return children;
      }

      // Add debug logging to see what's being processed
      if (process.env.NODE_ENV === "development" && debugMode) {
        console.log("Processing text node:", children);
      }

      const processedHtml = processWords(children);
      return (
        <span
          className="vocab-text"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
    },

    // Add support for HTML rendering when needed
    html: ({ node, ...props }) => {
      if (node.value && typeof node.value === "string") {
        return <div dangerouslySetInnerHTML={{ __html: node.value }} />;
      }
      return null;
    },
  };

  const refreshVocabulary = async () => {
    console.log("Refreshing vocabulary from API...");
    const freshVocabulary = await window.electronAPI.getAllVocabulary();
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

      // Update the vocabulary in memory immediately to reflect the new level
      setVocabulary((prevVocab) => {
        const updatedVocab = [...prevVocab];
        const existingWordIndex = updatedVocab.findIndex(
          (v) => v.word && v.word.toLowerCase() === word.toLowerCase()
        );

        if (existingWordIndex >= 0) {
          // Update existing word's level
          updatedVocab[existingWordIndex] = {
            ...updatedVocab[existingWordIndex],
            level,
          };
        } else {
          // Add new word to vocabulary
          updatedVocab.push(wordData);
        }

        return updatedVocab;
      });

      // Force re-render after updating vocabulary
      setForceUpdateKey(Date.now());

      // Close the popup
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
          <button
            onClick={() => setDebugMode((prev) => !prev)}
            className={`px-3 py-1 ${
              debugMode
                ? "bg-red-200 hover:bg-red-300"
                : "bg-gray-200 hover:bg-gray-300"
            } rounded text-sm`}
          >
            {debugMode ? "Disable Debug" : "Enable Debug"}
          </button>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    // Changed condition to ensure pagination shows when content is paginated
    if (!reading || !reading.content) return null;

    return (
      <div className="flex justify-between items-center mt-8 mb-6">
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center px-4 py-2 rounded ${
            currentPage === 1
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          <span className="mr-2">←</span> Previous Page
        </button>

        <div className="text-gray-600">
          Page {currentPage} of {totalPages}
          {completedPages.includes(currentPage) && (
            <span className="ml-2 text-green-600">✓</span>
          )}
        </div>

        <button
          onClick={() => navigateToPage(currentPage + 1)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {currentPage === totalPages ? "Complete Reading" : "Next Page"}{" "}
          <span className="ml-2">→</span>
        </button>
      </div>
    );
  };

  // Replace the modal with an in-page congratulation section
  const renderCompletionSection = () => {
    if (!showCompletionModal) return null;

    return (
      <div className="bg-white p-8 rounded-lg shadow-xl border-2 border-green-500 mt-8 mb-4">
        <div className="flex flex-col items-center">
          <div className="text-green-600 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-green-600 text-center">
            Congratulations!
          </h2>
          <p className="mb-6 text-center">
            You've completed reading "{reading.title}"! All words have been
            added to your vocabulary tracker for future learning.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button
              onClick={() => navigate("/readings")}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Readings
            </button>
            <button
              onClick={() => navigate("/vocabulary")}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              View Vocabulary
            </button>
          </div>
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

  const paginatedContent = paginateContent(reading.content);
  const currentPageContent =
    paginatedContent[currentPage - 1] || reading.content;

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

      {renderPagination()}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{reading.title}</h1>
          <p className="text-gray-500 mb-4">
            {reading.source && `Source: ${reading.source}`}
            {reading.source && " • "}
            Last updated: {new Date(reading.updatedAt).toLocaleDateString()}
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>

          <div
            className={`prose max-w-none text-content reading-content ${
              debugMode ? "debug-mode" : ""
            }`}
            ref={contentRef}
          >
            <ReactMarkdown
              components={customRenderers}
              key={`markdown-${readingId}-${currentPage}-${forceUpdateKey}`}
              skipHtml={false}
              unwrapDisallowed={false}
            >
              {currentPageContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {renderPagination()}
      {renderCompletionSection()}

      <style jsx="true">{`
        .reading-content .vocab-word {
          position: relative;
          z-index: 1;
          transition: background-color 0.2s;
        }
        .reading-content .vocab-word:hover {
          text-decoration: underline;
        }
        /* Make sure hovering over a list item only affects the specific word being hovered */
        .reading-content li:hover {
          text-decoration: none;
        }
        .reading-content li .vocab-word:hover {
          text-decoration: underline;
        }
        /* Similar fix for other container elements */
        .reading-content p:hover,
        .reading-content h1:hover,
        .reading-content h2:hover,
        .reading-content h3:hover,
        .reading-content h4:hover,
        .reading-content h5:hover,
        .reading-content h6:hover,
        .reading-content blockquote:hover {
          text-decoration: none;
        }
        .debug-mode .vocab-paragraph {
          outline: 1px solid green;
        }
        .debug-mode .vocab-text {
          outline: 1px dotted red;
        }
        .debug-mode .vocab-list-item {
          outline: 1px solid purple;
        }
        .debug-mode .vocab-heading {
          outline: 2px solid blue;
        }
        .debug-mode .vocab-ul,
        .debug-mode .vocab-ol {
          outline: 1px dashed brown;
        }
        .debug-mode .vocab-blockquote {
          outline: 2px dotted teal;
        }
        .debug-mode .vocab-strong {
          outline: 1px solid darkred;
        }
        .debug-mode .vocab-em {
          outline: 1px solid darkblue;
        }
      `}</style>

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

export default ReadingView;
