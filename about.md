# GitHub Copilot Prompt: Build “VocaFlow” – a Vietnamese-English Reading & Vocabulary Desktop App with Electron

## Project Overview

We want to build VocaFlow, a cross-platform desktop app using Electron for Vietnamese learners to improve English reading and vocabulary. It offers a LingQ-style reading experience, adaptive vocabulary tracking (Hard/Familiar/Known), AI-powered exercises, translation via Google Translate (without API), dictionary lookups via Oxford website DOM scraping, and local data storage on the user’s machine. No authentication is required.

## Key Features & Flow

### 1. Reading Mode

- Import or paste articles/texts (supports .txt files).
- Automatically parse and highlight known words with colors:
  - Hard (red)
  - Familiar (orange)
  - Known (green)
- On click of any word, show a popup:
  - Oxford Dictionary definition (scraped from Oxford website HTML DOM)
  - Example sentences (from text + AI-generated)
  - “Save to VocaFlow” button with default difficulty = Hard

### 2. Vocabulary Collection & Tracking

- User’s personal vocab list stored in a local JSON file (`vocab.json`).
- Each entry: `{ word, partOfSpeech, definition, exampleSentences: [], level: Hard|Familiar|Known, lastReviewed: Date }`
- Bulk import from text highlights.
- Dashboard to view/edit levels, bulk-change levels.

### 3. Adaptive Practice Flow

- Scheduler that resurfaces Hard & Familiar words using spaced repetition.
- Three tiers of exercises, automatically generated each session:
  - **Recall (Active) Exercises**
    - **Translate-Back**: Given Vietnamese prompt → type English sentence using 3–5 target words.
    - **Cloze-Fill**: A paragraph with blanks → choose from word bank (Hard words).
    - **Sentence Rearrange**: AI-shuffle words → drag & drop to form correct sentence.
  - **Recognition (Passive) Exercises**
    - **Multiple Choice**: Vietnamese prompt → select correct English translation.
    - **Flashcards**: Front = English word, Back = Vietnamese + sentence.
  - **Production (Writing)**
    - **Essay Prompt**: AI-generate a short topic incorporating 5–7 target words.
    - **Error Correction**: AI-generate a short paragraph with 2–3 mistakes; user identifies/corrects them using target words.

### 4. AI & Translation Integration

- **groq API (or OpenAI)**
  - Generate example sentences with target words in context.
  - Create essay prompts & error-correction paragraphs.
  - Summarize long articles into 3–5 bullet points (for comprehension tasks).
- **Google Translate (without API)**
  - Use Puppeteer or similar to scrape Google Translate website for Vietnamese ↔ English translations.
  - **TTS**: Use browser-native Web Speech API for pronunciation of English sentences.

### 5. Data Storage

- Store `vocab.json` and `progress.json` locally in the user’s app data directory (via Electron’s `app.getPath('userData')`).
- No authentication required.

## Technical Stack & Architecture

- **Electron** for cross-platform desktop app development.
- **ReactJS** with hooks & Context API for the frontend.
- **TailwindCSS** for styling.
- **React Router** for page navigation.
- **Puppeteer** or **Cheerio** for scraping Google Translate and Oxford Dictionary websites.
- **groq/openai** client module for AI-powered features.
- **State Management**: Context + local JSON file storage.
- **File System**: Electron’s `fs` module for reading/writing local JSON files.
- **Architecture**:
  - Main process: Handles Electron window management, file system operations, and scraping tasks.
  - Renderer process: Runs React app for UI and communicates with the main process via IPC (Inter-Process Communication).
  - Use `electron-store` for simple key-value storage of app settings.
