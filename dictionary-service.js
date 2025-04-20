/*
 * Oxford Dictionary API implementation
 * Based on https://github.com/NearHuscarl/oxford-dictionary-api
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2018, Near Huscarl
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 */

const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

class DictionaryService {
  constructor() {
    this.browser = null;
    this.cache = {};
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    };
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }

  async lookupWord(word) {
    // Check cache first
    if (this.cache[word]) {
      console.log(`Using cached definition for '${word}'`);
      return this.cache[word];
    }

    await this.initialize();

    try {
      const page = await this.browser.newPage();

      // Set a user-agent to avoid being detected as a bot
      await page.setUserAgent(this.headers["User-Agent"]);

      // Improve error handling by setting default timeouts
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(15000);

      // Suppress console errors from the page
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.log("Page error:", msg.text());
        }
      });

      // Block cookies and unnecessary resources to improve performance
      await page.setCookie({
        name: "cookieControl",
        value: "false",
        domain: "www.oxfordlearnersdictionaries.com",
        path: "/",
      });

      // Block unnecessary resource types
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const resourceType = request.resourceType();
        if (["image", "media", "font", "stylesheet"].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Navigate to Oxford Dictionary - first try the definition page directly
      const url = `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(
        word.toLowerCase().replace(/\s+/g, "-")
      )}`;

      console.log(`Looking up word '${word}' at ${url}`);

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
      } catch (navError) {
        console.error(`Navigation error for '${word}':`, navError.message);
        // Proceed anyway as we'll check for content below
      }

      // Check if we need to search instead - look for both not found indicator and entry content
      let hasEntry = false;

      try {
        hasEntry = await page.evaluate(() => {
          return !!document.querySelector(".entry");
        });

        if (!hasEntry) {
          console.log(`No direct entry found for '${word}', trying search...`);
          const searchUrl = `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(
            word.toLowerCase()
          )}`;

          await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          // Wait a bit for search results
          await page.waitForTimeout(2000);

          // Check if we have search results with links
          const hasResults = await page.evaluate(() => {
            // Click on the first result if available
            const firstResult = document.querySelector(".search-results a");
            if (firstResult) {
              firstResult.click();
              return true;
            }
            return false;
          });

          if (hasResults) {
            // Wait for navigation to complete after clicking the first result
            await page
              .waitForNavigation({
                waitUntil: "domcontentloaded",
                timeout: 10000,
              })
              .catch(() =>
                console.log("Navigation timeout after clicking result")
              );
          }
        }
      } catch (evalError) {
        console.error("Error evaluating page:", evalError.message);
      }

      // Get the content regardless of previous errors
      const content = await page.content();

      // Close the page to free resources
      await page.close();

      // Parse the HTML with Cheerio
      const $ = cheerio.load(content);

      // Check if the word was found by looking for key elements
      const entryElement = $(".entry");
      const errorElement = $(".water-no-results");

      if (entryElement.length === 0 || errorElement.length > 0) {
        console.log(`Word '${word}' not found in dictionary`);
        return {
          word: word,
          error: "Word not found in dictionary",
          definitions: [],
          examples: [],
        };
      }

      // Extract all the information
      const wordInfo = this.parseWordInfo($, word);

      // Only cache valid results
      if (wordInfo.definitions.length > 0) {
        this.cache[word] = wordInfo;
      } else {
        console.log(`No definitions found for '${word}', not caching`);
      }

      return wordInfo;
    } catch (error) {
      console.error(`Error looking up word '${word}':`, error);
      return {
        word: word,
        error: `Failed to look up word: ${error.message}`,
        definitions: [],
        examples: [],
      };
    }
  }

  parseWordInfo($, word) {
    const result = {
      word: word,
      partOfSpeech: $(".pos").first().text().trim() || "",
      phoneticSpelling: $(".phon").first().text().trim() || "",
      definitions: [],
      examples: [],
      idioms: [],
      pronunciations: this.getPronunciations($),
    };

    // Get definitions and examples from all possible containers
    [".sense", ".senseGroup", ".sense_single"].forEach((selector) => {
      $(selector).each((i, el) => {
        const senseElement = $(el);
        const definition = senseElement.find(".def").text().trim();

        if (definition) {
          result.definitions.push(definition);

          // Extract examples for this definition
          const examples = [];
          senseElement.find(".examples .x, .x-g .x").each((j, exEl) => {
            const example = $(exEl).text().trim();
            if (example) examples.push(example);
          });

          // Add examples to the main examples array
          result.examples = [...result.examples, ...examples];
        }
      });
    });

    // Get idioms
    $(".idm-g").each((i, el) => {
      const idiomElement = $(el);
      const idiomName =
        idiomElement.find(".idm").text().trim() ||
        idiomElement.find(".idm-l").text().trim();

      if (idiomName) {
        const idiomInfo = {
          name: idiomName,
          definitions: [],
          examples: [],
        };

        // Get definitions and examples for this idiom
        idiomElement.find(".sense").each((j, senseEl) => {
          const def = $(senseEl).find(".def").text().trim();
          if (def) {
            idiomInfo.definitions.push(def);
          }

          $(senseEl)
            .find(".examples .x")
            .each((k, exEl) => {
              const example = $(exEl).text().trim();
              if (example) {
                idiomInfo.examples.push(example);
              }
            });
        });

        result.idioms.push(idiomInfo);
      }
    });

    // Determine overall level (if information is provided)
    // Some Oxford dictionary entries include CEFR level indicators
    const cefrLevel = $(".symbols-cefr").text().trim();
    if (cefrLevel) {
      result.level = cefrLevel;
    }

    // Collect extra examples if any
    $('.res-g [title="Extra examples"] .x-gs .x').each((i, el) => {
      result.examples.push($(el).text().trim());
    });

    return result;
  }

  getPronunciations($) {
    const british = { prefix: "BrE", ipa: null, audio: null };
    const american = { prefix: "NAmE", ipa: null, audio: null };

    // Get British pronunciation
    const brPhon = $("[geo=br] .phon").first().text().trim();
    if (brPhon) {
      british.ipa = brPhon;
    }

    // Get American pronunciation
    const usPhon = $("[geo=n_am] .phon").first().text().trim();
    if (usPhon) {
      american.ipa = usPhon;
    }

    // Get audio URLs
    const brAudio = $("[geo=br] [data-src-mp3]").first().attr("data-src-mp3");
    if (brAudio) {
      british.audio = brAudio;
    }

    const usAudio = $("[geo=n_am] [data-src-mp3]").first().attr("data-src-mp3");
    if (usAudio) {
      american.audio = usAudio;
    }

    return [british, american].filter((p) => p.ipa || p.audio);
  }

  async translateText(text, fromLang = "en", toLang = "vi") {
    await this.initialize();

    try {
      const page = await this.browser.newPage();

      // Set a user-agent to avoid being detected as a bot
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36"
      );

      // Navigate to Google Translate
      const url = `https://translate.google.com/?sl=${fromLang}&tl=${toLang}&text=${encodeURIComponent(
        text
      )}&op=translate`;
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for the translation to appear
      await page.waitForSelector(".ryNqvb", { timeout: 5000 }).catch(() => {});

      // Give some extra time for the translation to complete
      await page.waitForTimeout(1000);

      const content = await page.content();
      await page.close();

      // Parse the HTML with Cheerio
      const $ = cheerio.load(content);

      // Extract translation
      const translation = $(".ryNqvb").text().trim();

      return {
        original: text,
        translation: translation || "Translation not found",
      };
    } catch (error) {
      console.error(`Error translating text:`, error);
      return {
        original: text,
        translation: "Error: Could not translate text",
        error: error.toString(),
      };
    }
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error("Error closing browser:", error);
      }
      this.browser = null;
    }
  }
}

module.exports = new DictionaryService();
