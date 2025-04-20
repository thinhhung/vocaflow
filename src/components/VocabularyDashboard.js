import React, { useState, useEffect } from "react";

export const VocabularyDashboard = () => {
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedWords, setSelectedWords] = useState([]);

  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        const vocab = await window.electronAPI.getVocabulary();
        setVocabulary(vocab);
        setLoading(false);
      } catch (error) {
        console.error("Error loading vocabulary:", error);
        setLoading(false);
      }
    };

    loadVocabulary();
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
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
    if (selectedWords.length === filteredVocabulary.length) {
      setSelectedWords([]);
    } else {
      setSelectedWords(filteredVocabulary.map((word) => word.id));
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

  const handleDeleteWord = async (wordId) => {
    try {
      await window.electronAPI.deleteWord(wordId);
      setVocabulary((prev) => prev.filter((word) => word.id !== wordId));
    } catch (error) {
      console.error("Error deleting word:", error);
    }
  };

  const filteredVocabulary = vocabulary.filter((word) => {
    if (filter === "all") return true;
    return word.level === filter;
  });

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Vocabulary Dashboard</h2>

      {loading ? (
        <p>Loading vocabulary...</p>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <button
                onClick={() => handleFilterChange("all")}
                className={`px-3 py-1 mr-2 rounded ${
                  filter === "all" ? "bg-gray-800 text-white" : "bg-gray-200"
                }`}
              >
                All ({vocabulary.length})
              </button>
              <button
                onClick={() => handleFilterChange("hard")}
                className={`px-3 py-1 mr-2 rounded ${
                  filter === "hard" ? "bg-red-600 text-white" : "bg-red-100"
                }`}
              >
                Hard ({vocabulary.filter((w) => w.level === "hard").length})
              </button>
              <button
                onClick={() => handleFilterChange("familiar")}
                className={`px-3 py-1 mr-2 rounded ${
                  filter === "familiar"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100"
                }`}
              >
                Familiar (
                {vocabulary.filter((w) => w.level === "familiar").length})
              </button>
              <button
                onClick={() => handleFilterChange("known")}
                className={`px-3 py-1 rounded ${
                  filter === "known"
                    ? "bg-green-600 text-white"
                    : "bg-green-100"
                }`}
              >
                Known ({vocabulary.filter((w) => w.level === "known").length})
              </button>
            </div>

            {selectedWords.length > 0 && (
              <div>
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
                  className="px-3 py-1 bg-green-500 text-white rounded"
                >
                  Mark Known
                </button>
              </div>
            )}
          </div>

          {vocabulary.length === 0 ? (
            <p className="text-gray-500">
              No vocabulary words yet. Go to Reading Mode to add words.
            </p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={
                          filteredVocabulary.length > 0 &&
                          selectedWords.length === filteredVocabulary.length
                        }
                        onChange={handleSelectAll}
                        className="mr-2"
                      />
                      Word
                    </th>
                    <th className="px-4 py-2">Definition</th>
                    <th className="px-4 py-2">Level</th>
                    <th className="px-4 py-2">Last Reviewed</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVocabulary.map((word) => (
                    <tr key={word.id} className="border-t">
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
                            {word.partOfSpeech}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {word.definition && word.definition.length > 80
                          ? `${word.definition.substring(0, 80)}...`
                          : word.definition || "-"}
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
                          {word.level}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(word.lastReviewed).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteWord(word.id)}
                          className="text-red-500 hover:text-red-700"
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
        </>
      )}
    </div>
  );
};
