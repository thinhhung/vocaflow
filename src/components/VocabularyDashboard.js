import React, { useState, useEffect } from "react";

const VocabularyDashboard = () => {
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedWords, setSelectedWords] = useState([]);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        const words = await window.electronAPI.getAllVocabulary();
        setVocabulary(Array.isArray(words) ? words : []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching vocabulary:", err);
        setError("Failed to load vocabulary. Please try again.");
        setLoading(false);
      }
    };

    fetchVocabulary();
  }, []);

  const handleDelete = async (wordId) => {
    if (window.confirm("Are you sure you want to delete this word?")) {
      try {
        await window.electronAPI.deleteWord(wordId);
        setVocabulary(vocabulary.filter((word) => word.id !== wordId));
        setSelectedWords(selectedWords.filter((id) => id !== wordId));
      } catch (err) {
        console.error("Error deleting word:", err);
        setError("Failed to delete word. Please try again.");
      }
    }
  };

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
  };

  const handleSelectWord = (wordId) => {
    setSelectedWords((prev) => {
      if (prev.includes(wordId)) {
        return prev.filter((id) => id !== wordId);
      } else {
        return [...prev, wordId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedWords.length === filteredAndSortedVocabulary.length) {
      setSelectedWords([]);
    } else {
      setSelectedWords(filteredAndSortedVocabulary.map((word) => word.id));
    }
  };

  const handleBulkChange = async (level) => {
    if (selectedWords.length === 0) return;

    try {
      const updatedWords = [];
      for (const wordId of selectedWords) {
        const word = vocabulary.find((w) => w.id === wordId);
        if (word) {
          const updated = await window.electronAPI.updateWord({
            ...word,
            level,
          });
          updatedWords.push(updated);
        }
      }

      setVocabulary((prev) => {
        const newVocab = [...prev];
        for (const updatedWord of updatedWords) {
          const index = newVocab.findIndex((w) => w.id === updatedWord.id);
          if (index !== -1) {
            newVocab[index] = updatedWord;
          }
        }
        return newVocab;
      });

      setSelectedWords([]);
    } catch (error) {
      console.error("Error updating word levels:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWords.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedWords.length} selected word(s)?`
      )
    ) {
      try {
        for (const wordId of selectedWords) {
          await window.electronAPI.deleteWord(wordId);
        }

        // Remove deleted words from the vocabulary state
        setVocabulary((prev) =>
          prev.filter((word) => !selectedWords.includes(word.id))
        );

        // Clear selection
        setSelectedWords([]);
      } catch (error) {
        console.error("Error deleting words:", error);
        setError("Failed to delete words. Please try again.");
      }
    }
  };

  // First filter by level, then by search term, then sort
  const filteredAndSortedVocabulary = vocabulary
    .filter((word) => {
      // Level filter
      if (levelFilter === "all") return true;
      return word.level === levelFilter;
    })
    .filter((word) => {
      // Search filter
      if (!searchFilter) return true;

      return (
        word.word.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (word.definition &&
          word.definition.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    })
    .sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      if (sortBy === "dateAdded") {
        compareA = new Date(compareA || 0);
        compareB = new Date(compareB || 0);
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (loading)
    return <div className="text-center p-4">Loading vocabulary...</div>;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Vocabulary Dashboard</h2>

      <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
        <div>
          <button
            onClick={() => setLevelFilter("all")}
            className={`px-3 py-1 mr-2 rounded ${
              levelFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-200"
            }`}
          >
            All ({vocabulary.length})
          </button>
          <button
            onClick={() => setLevelFilter("hard")}
            className={`px-3 py-1 mr-2 rounded ${
              levelFilter === "hard" ? "bg-red-600 text-white" : "bg-red-100"
            }`}
          >
            Hard ({vocabulary.filter((w) => w.level === "hard").length})
          </button>
          <button
            onClick={() => setLevelFilter("familiar")}
            className={`px-3 py-1 mr-2 rounded ${
              levelFilter === "familiar"
                ? "bg-orange-500 text-white"
                : "bg-orange-100"
            }`}
          >
            Familiar ({vocabulary.filter((w) => w.level === "familiar").length})
          </button>
          <button
            onClick={() => setLevelFilter("known")}
            className={`px-3 py-1 rounded ${
              levelFilter === "known"
                ? "bg-green-600 text-white"
                : "bg-green-100"
            }`}
          >
            Known ({vocabulary.filter((w) => w.level === "known").length})
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Search words or definitions..."
            className="px-3 py-2 border border-gray-300 rounded"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {selectedWords.length > 0 && (
        <div className="mb-4 bg-gray-100 p-2 rounded flex items-center flex-wrap">
          <span className="mr-2">{selectedWords.length} words selected:</span>
          <button
            onClick={() => handleBulkChange("hard")}
            className="px-3 py-1 mr-2 bg-red-500 text-white rounded"
          >
            Mark Hard
          </button>
          <button
            onClick={() => handleBulkChange("familiar")}
            className="px-3 py-1 mr-2 bg-orange-500 text-white rounded"
          >
            Mark Familiar
          </button>
          <button
            onClick={() => handleBulkChange("known")}
            className="px-3 py-1 mr-2 bg-green-500 text-white rounded"
          >
            Mark Known
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 bg-red-600 text-white rounded ml-auto"
          >
            Delete Selected
          </button>
        </div>
      )}

      {filteredAndSortedVocabulary.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          {searchFilter || levelFilter !== "all"
            ? "No matching words found."
            : "You haven't saved any vocabulary words yet."}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedVocabulary.length > 0 &&
                      selectedWords.length ===
                        filteredAndSortedVocabulary.length
                    }
                    onChange={handleSelectAll}
                    className="mr-2"
                  />
                  <button
                    className="cursor-pointer"
                    onClick={() => handleSort("word")}
                  >
                    Word{" "}
                    {sortBy === "word" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-4 py-2">Definition</th>
                <th className="px-4 py-2">Level</th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("dateAdded")}
                >
                  Date Added{" "}
                  {sortBy === "dateAdded" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVocabulary.map((word) => (
                <tr key={word.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedWords.includes(word.id)}
                      onChange={() => handleSelectWord(word.id)}
                      className="mr-2"
                    />
                    <span className="font-medium">{word.word}</span>
                    {word.partOfSpeech && (
                      <span className="text-gray-500 italic ml-1">
                        ({word.partOfSpeech})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {word.definition && word.definition.length > 100
                      ? `${word.definition.substring(0, 100)}...`
                      : word.definition ||
                        word.meanings?.[0]?.definition ||
                        "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        word.level === "hard"
                          ? "px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                          : word.level === "familiar"
                          ? "px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                          : "px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      }
                    >
                      {word.level || "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {word.dateAdded
                      ? new Date(word.dateAdded).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(word.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VocabularyDashboard;
