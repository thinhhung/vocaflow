import React, { useState, useEffect } from "react";

export const WordPopup = ({ word, onClose, onSave }) => {
  const [definition, setDefinition] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [examples, setExamples] = useState([]);
  const [phoneticSpelling, setPhoneticSpelling] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDefinition = async () => {
      setLoading(true);
      try {
        const result = await window.electronAPI.lookupWord(word);

        if (result.error) {
          setError(result.error);
        } else {
          setPartOfSpeech(result.partOfSpeech);
          setPhoneticSpelling(result.phoneticSpelling);
          setDefinition(result.definitions.join("; "));
          setExamples(result.examples);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching definition:", error);
        setError("Failed to fetch definition. Please try again.");
        setLoading(false);
      }
    };

    fetchDefinition();
  }, [word]);

  const handleSpeakText = () => {
    window.electronAPI.speakText(word);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          &times;
        </button>

        <div className="mb-4 pr-6">
          <h3 className="text-xl font-bold">
            {word}{" "}
            {phoneticSpelling && (
              <span className="text-gray-500 text-sm">{phoneticSpelling}</span>
            )}
          </h3>
        </div>

        {loading ? (
          <p className="text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            <div
              className="overflow-y-auto pr-1 flex-1"
              style={{ maxHeight: "60vh" }}
            >
              {partOfSpeech && (
                <div className="mb-2 bg-gray-50 p-2 rounded">
                  <span className="text-gray-600 italic font-medium">
                    {partOfSpeech}
                  </span>
                  <button
                    onClick={handleSpeakText}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="Listen to pronunciation"
                  >
                    🔊
                  </button>
                </div>
              )}

              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 border-b pb-1">
                  Definition:
                </h4>
                <div className="mt-2 text-gray-800 leading-relaxed">
                  {definition
                    ? definition.split("; ").map((def, idx) => (
                        <p key={idx} className="mb-2">
                          {idx + 1}. {def}
                        </p>
                      ))
                    : "No definition found"}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 border-b pb-1">
                  Example Sentences:
                </h4>
                {examples.length > 0 ? (
                  <ul className="list-disc pl-5 mt-2 text-gray-700">
                    {examples.slice(0, 10).map((example, index) => (
                      <li key={index} className="mb-1 leading-relaxed">
                        {example}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 mt-2">No examples found</p>
                )}
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => onSave(word, "hard")}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-medium"
              >
                Hard
              </button>
              <button
                onClick={() => onSave(word, "familiar")}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-medium"
              >
                Familiar
              </button>
              <button
                onClick={() => onSave(word, "known")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-medium"
              >
                Known
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
