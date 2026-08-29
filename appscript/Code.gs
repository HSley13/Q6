/**
 * 4G 吃到飽 SERP entity analysis -> Google Sheet
 *
 * Pipeline: SerpApi (top-10 organic results, keyword not hardcoded) ->
 * fetch each article's HTML -> Gemini API extracts entities + a topic
 * label per entity, with a per-article mention count -> written to two
 * sheets: a full per-article/per-entity table, and a per-article summary
 * (unique entity count + total mentions).
 *
 * Setup:
 *   1. Extensions > Apps Script on any Google Sheet, paste this file in.
 *   2. Run `setApiKeys` once (menu: "SERP Entity Analysis > Set API Keys")
 *      and enter a SerpApi key (serpapi.com) and a Gemini API key
 *      (aistudio.google.com/apikey -- free tier, no GCP billing needed).
 *   3. Reload the sheet, use menu "SERP Entity Analysis > Run Analysis",
 *      enter a keyword when prompted (e.g. "4G 吃到飽").
 *
 * Sharing the Sheet with specific people (and not "Anyone with the link")
 * is the login/access-control mechanism for this deliverable -- Google's
 * own account-based permissions stand in for a bespoke login screen.
 */

const SERPAPI_KEY_PROP = "SERPAPI_API_KEY";
const GEMINI_KEY_PROP = "GEMINI_API_KEY";
const GEMINI_MODEL = "gemini-2.0-flash";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("SERP Entity Analysis")
    .addItem("Run Analysis", "runAnalysis")
    .addItem("Set API Keys", "setApiKeys")
    .addToUi();
}

function setApiKeys() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const serpResp = ui.prompt("Enter your SerpApi API key (leave blank to keep existing):");
  if (serpResp.getSelectedButton() === ui.Button.OK && serpResp.getResponseText().trim()) {
    props.setProperty(SERPAPI_KEY_PROP, serpResp.getResponseText().trim());
  }

  const geminiResp = ui.prompt("Enter your Gemini API key (leave blank to keep existing):");
  if (geminiResp.getSelectedButton() === ui.Button.OK && geminiResp.getResponseText().trim()) {
    props.setProperty(GEMINI_KEY_PROP, geminiResp.getResponseText().trim());
  }

  ui.alert("API keys saved.");
}

function runAnalysis() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const serpKey = props.getProperty(SERPAPI_KEY_PROP);
  const geminiKey = props.getProperty(GEMINI_KEY_PROP);

  if (!serpKey || !geminiKey) {
    ui.alert('Set both API keys first: menu "SERP Entity Analysis > Set API Keys".');
    return;
  }

  const keywordResp = ui.prompt("Search keyword (e.g. 4G 吃到飽):");
  if (keywordResp.getSelectedButton() !== ui.Button.OK) return;
  const keyword = keywordResp.getResponseText().trim();
  if (!keyword) {
    ui.alert("No keyword entered.");
    return;
  }

  const toast = (msg) => SpreadsheetApp.getActiveSpreadsheet().toast(msg, "4G Entity Analysis", 5);

  toast('Fetching SERP results for "' + keyword + '"...');
  const results = fetchSerpResults(keyword, serpKey);
  if (results.length === 0) {
    ui.alert("SerpApi returned no organic results for that keyword.");
    return;
  }

  const perArticle = results.map(function (r, i) {
    toast("Fetching article " + (i + 1) + "/" + results.length + "...");
    const text = fetchArticleText(r.url);
    const entities = text ? extractEntities(text, geminiKey) : [];
    return {
      rank: r.rank,
      title: r.title,
      url: r.url,
      entities: entities,
    };
  });

  writeToSheet(keyword, perArticle);
  ui.alert("Done. See the \"Results\" and \"Per-Article Summary\" sheets.");
}

/** SerpApi's full "google" engine 500s on some CJK queries; google_light
 * returns the same organic_results shape and doesn't have that bug
 * (see backend/serp/scraper.py in this repo for where this was found). */
function fetchSerpResults(keyword, serpKey) {
  const url =
    "https://serpapi.com/search.json" +
    "?engine=google_light" +
    "&q=" + encodeURIComponent(keyword) +
    "&google_domain=google.com.tw&gl=tw&hl=zh-tw&num=10" +
    "&api_key=" + encodeURIComponent(serpKey);

  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    Logger.log("SerpApi error: " + resp.getContentText());
    return [];
  }

  const data = JSON.parse(resp.getContentText());
  const organic = data.organic_results || [];
  return organic
    .slice(0, 10)
    .map(function (r, i) {
      return { rank: i + 1, title: r.title || "", url: r.link || "" };
    })
    .filter(function (r) {
      return !!r.url;
    });
}

function fetchArticleText(url) {
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      // A few real SERP results serve a misconfigured TLS cert chain that
      // strict verification rejects even though browsers tolerate it; this
      // is a read of public marketing copy, not a channel carrying
      // credentials, so skipping verification is a reasonable tradeoff to
      // avoid losing the article entirely.
      validateHttpsCertificates: false,
    });
    if (resp.getResponseCode() >= 400) return "";

    const html = resp.getContentText();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();

    // Keep the Gemini prompt a reasonable size; article body text rarely
    // needs more than this to extract the entities that actually recur.
    return text.slice(0, 8000);
  } catch (e) {
    Logger.log("Failed to fetch " + url + ": " + e);
    return "";
  }
}

/** Returns [{entity, count, topic}], where `topic` is a short Chinese
 * category label Gemini assigns per entity -- the "entity 主題分群" step,
 * done inline instead of a separate embedding+KMeans pass. */
function extractEntities(articleText, geminiKey) {
  const prompt =
    "Extract named entities (organizations, brands/plans, products, people, locations) " +
    "from the following Traditional Chinese article text. For each distinct entity, count " +
    "how many times it is mentioned in this text, and assign a short topic/category label " +
    "in Chinese (e.g. 電信業者, 資費方案, 股票代號, 人物). Merge obvious duplicate surface " +
    'forms of the same entity. Return ONLY compact JSON, no prose, no markdown fences, in ' +
    'this exact shape: [{"entity":"...","count":N,"topic":"..."}]. If there are no clear ' +
    "entities, return []." +
    "\n\nText:\n" + articleText;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(geminiKey);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  };

  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log("Gemini error: " + resp.getContentText());
    return [];
  }

  try {
    const data = JSON.parse(resp.getContentText());
    const raw = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    Logger.log("Failed to parse Gemini response: " + e + " | " + resp.getContentText().slice(0, 300));
    return [];
  }
}

function writeToSheet(keyword, perArticle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const results = getOrCreateSheet(ss, "Results");
  results.clear();
  const header = ["Rank", "Article Title", "Article URL", "Entity", "Topic", "Count in Article"];
  const rows = [header];
  perArticle.forEach(function (a) {
    if (a.entities.length === 0) {
      rows.push([a.rank, a.title, a.url, "(no entities extracted)", "", ""]);
      return;
    }
    a.entities.forEach(function (e) {
      rows.push([a.rank, a.title, a.url, e.entity, e.topic, e.count]);
    });
  });
  results.getRange(1, 1, rows.length, header.length).setValues(rows);
  results.getRange(1, 1, 1, header.length).setFontWeight("bold");
  results.autoResizeColumns(1, header.length);

  const summary = getOrCreateSheet(ss, "Per-Article Summary");
  summary.clear();
  const summaryHeader = ["Rank", "Article Title", "Article URL", "Unique Entities", "Total Mentions"];
  const summaryRows = [summaryHeader];
  perArticle.forEach(function (a) {
    const totalMentions = a.entities.reduce(function (sum, e) {
      return sum + (e.count || 0);
    }, 0);
    summaryRows.push([a.rank, a.title, a.url, a.entities.length, totalMentions]);
  });
  summary.getRange(1, 1, summaryRows.length, summaryHeader.length).setValues(summaryRows);
  summary.getRange(1, 1, 1, summaryHeader.length).setFontWeight("bold");
  summary.autoResizeColumns(1, summaryHeader.length);

  const meta = getOrCreateSheet(ss, "Run Info");
  meta.clear();
  meta.getRange(1, 1, 2, 2).setValues([
    ["Keyword", "Run at"],
    [keyword, new Date().toISOString()],
  ]);
  meta.getRange(1, 1, 1, 2).setFontWeight("bold");
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
