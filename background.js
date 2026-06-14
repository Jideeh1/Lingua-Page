const DEFAULT_SETTINGS = {
    enabled: true,
    disabledHosts: [],
    autoTranslate: true,
    darkMode: false,
    targetLang: "en",
    provider: "google",
    libreEndpoint: "https://libretranslate.com/",
    libreApiKey: ""
};


async function migrateSyncToLocalIfNeeded() {
  const local = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const hasLocalSettings = Object.keys(local).some(key => local[key] !== undefined);
  if (hasLocalSettings) return;
  const sync = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const hasSyncSettings = Object.keys(sync).some(key => sync[key] !== undefined);
  await chrome.storage.local.set(hasSyncSettings ? { ...DEFAULT_SETTINGS, ...sync } : DEFAULT_SETTINGS);
}
chrome.runtime.onInstalled.addListener(() => migrateSyncToLocalIfNeeded());
chrome.runtime.onStartup.addListener(() => migrateSyncToLocalIfNeeded());
async function getSettings() {
  await migrateSyncToLocalIfNeeded();
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}
function normalizeHost(hostname) { return String(hostname || "").replace(/^www\./, "").toLowerCase(); }
function hostnameMatches(hostname, disabledHosts) {
  const h = normalizeHost(hostname);
  return (disabledHosts || []).some(item => {
    const d = normalizeHost(item);
    return h === d || h.endsWith("." + d);
  });
}
async function translateWithGoogle(text, source, target) {
  const url = "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=${encodeURIComponent(source || "auto")}` +
    `&tl=${encodeURIComponent(target || "en")}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google translate request failed: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.[0]) ? data[0].map(part => part?.[0] || "").join("") : text;
}
function libreTranslateCandidates(inputUrl) {
  const raw = String(inputUrl || "https://libretranslate.com/").trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  if (/\/translate$/i.test(withoutTrailingSlash)) return [withoutTrailingSlash];
  return [`${withoutTrailingSlash}/translate`, raw];
}
async function translateWithLibre(text, source, target) {
  const settings = await getSettings();
  const body = { q: text, source: source || "auto", target: target || "en", format: "text" };
  if (settings.libreApiKey) body.api_key = settings.libreApiKey;
  let lastError = null;
  for (const endpoint of libreTranslateCandidates(settings.libreEndpoint)) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.translatedText || text;
    } catch (err) { lastError = err; }
  }
  throw new Error(`LibreTranslate request failed: ${lastError?.message || "unknown error"}`);
}
async function translateText({ text, source = "auto", target = "en" }) {
  const settings = await getSettings();
  if (settings.provider === "libre") return translateWithLibre(text, source, target);
  return translateWithGoogle(text, source, target);
}
function detectLanguage(text) {
  return new Promise(resolve => {
    try {
      chrome.i18n.detectLanguage(text, result => {
        if (chrome.runtime.lastError || !result?.languages?.length) return resolve({ language: null, reliable: false });
        const best = result.languages[0];
        resolve({ language: best.language || null, reliable: Boolean(result.isReliable), percentage: best.percentage || 0 });
      });
    } catch (_err) { resolve({ language: null, reliable: false }); }
  });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_SETTINGS") return sendResponse(await getSettings());
    if (message.type === "SAVE_SETTINGS") {
      await chrome.storage.local.set(message.settings || {});
      return sendResponse({ ok: true, settings: await getSettings() });
    }
    if (message.type === "IS_HOST_DISABLED") {
      const settings = await getSettings();
      return sendResponse({ disabled: !settings.enabled || hostnameMatches(message.hostname, settings.disabledHosts), settings });
    }
    if (message.type === "TRANSLATE") return sendResponse({ translatedText: await translateText(message.payload) });
    if (message.type === "DETECT_LANGUAGE") return sendResponse(await detectLanguage(message.text || ""));
  })().catch(err => sendResponse({ error: err.message }));
  return true;
});
