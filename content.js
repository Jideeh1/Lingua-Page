(() => {
  const MAX_TEXT_NODES = 250;
  const MIN_TEXT_LENGTH = 2;
  const MAX_NODE_CHARS = 1200;
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT", "SELECT", "OPTION", "SVG", "CANVAS"]);
  const TRANSLATED_ATTR = "data-auto-translate-toggle-translated";
  const ORIGINAL_TEXT_ATTR = "data-auto-translate-toggle-original";
  let running = false;
  function send(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
  function normalizeLang(lang) { return (lang || "").toLowerCase().split("-")[0].trim(); }
  function textSample() { return (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1500); }
  function isEnglish(lang) { return normalizeLang(lang) === "en"; }
  async function shouldTranslate(targetLang) {
    const sample = textSample();
    if (sample.length < 20) return { translate: false, source: "auto" };
    const detected = await send("DETECT_LANGUAGE", { text: sample });
    const detectedLang = normalizeLang(detected?.language);
    const htmlLang = normalizeLang(document.documentElement.lang || document.querySelector("meta[http-equiv='content-language']")?.content);
    if (detectedLang && detected?.reliable) return { translate: !isEnglish(detectedLang) && detectedLang !== normalizeLang(targetLang), source: detectedLang };
    if (htmlLang) return { translate: !isEnglish(htmlLang) && htmlLang !== normalizeLang(targetLang), source: htmlLang };
    if (detectedLang) return { translate: !isEnglish(detectedLang) && detectedLang !== normalizeLang(targetLang), source: detectedLang };
    return { translate: false, source: "auto" };
  }
  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName) || parent.isContentEditable) return true;
    if (parent.closest(`[${TRANSLATED_ATTR}=\"true\"]`)) return true;
    if (parent.offsetParent === null && getComputedStyle(parent).position !== "fixed") return true;
    const text = node.nodeValue.replace(/\s+/g, " ").trim();
    if (text.length < MIN_TEXT_LENGTH || text.length > MAX_NODE_CHARS) return true;
    if (/^[\d\s\p{P}\p{S}]+$/u.test(text)) return true;
    return false;
  }
  function getTextNodes() {
    if (!document.body) return [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode()) && nodes.length < MAX_TEXT_NODES) nodes.push(node);
    return nodes;
  }
  async function translateNode(node, source, target) {
    const original = node.nodeValue;
    if (!original.trim()) return;
    const result = await send("TRANSLATE", { payload: { text: original, source, target } });
    if (result?.error) throw new Error(result.error);
    if (!result?.translatedText || result.translatedText === original) return;
    if (node.parentElement) {
      node.parentElement.setAttribute(ORIGINAL_TEXT_ATTR, original);
      node.parentElement.setAttribute(TRANSLATED_ATTR, "true");
    }
    node.nodeValue = result.translatedText;
  }
  function showStatus(message, isError = false) {
    let el = document.getElementById("auto-translate-toggle-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "auto-translate-toggle-status";
      el.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:8px 10px;border-radius:8px;background:#111827;color:white;font:12px system-ui;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:300px;";
      document.documentElement.appendChild(el);
    }
    el.style.background = isError ? "#991b1b" : "#111827";
    el.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => el.remove(), 3500);
  }
  async function run({ force = false } = {}) {
    if (running || !document.body) return;
    running = true;
    try {
      const hostStatus = await send("IS_HOST_DISABLED", { hostname: location.hostname });
      if (hostStatus?.error) throw new Error(hostStatus.error);
      if (hostStatus?.disabled) return;
      const settings = hostStatus.settings || { targetLang: "en", autoTranslate: true };
      if (!force && settings.autoTranslate === false) return;
      const target = settings.targetLang || "en";
      const decision = await shouldTranslate(target);
      if (!decision.translate) return;
      const nodes = getTextNodes();
      if (!nodes.length) return;
      showStatus(`Auto-translating ${nodes.length} text blocks...`);
      for (const node of nodes) {
        await translateNode(node, decision.source || "auto", target);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      showStatus("Translation complete");
    } catch (err) {
      console.warn("Auto Translate Toggle:", err);
      showStatus(`Translation failed: ${err.message}`, true);
    } finally { running = false; }
  }
  function scheduleAutoRun(delay) { setTimeout(() => run({ force: false }), delay); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { scheduleAutoRun(700); scheduleAutoRun(2500); });
  } else { scheduleAutoRun(700); scheduleAutoRun(2500); }
  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => run({ force: false }), 1800);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "RUN_TRANSLATION_NOW") {
      run({ force: true }).then(() => sendResponse({ ok: true })).catch(err => sendResponse({ error: err.message }));
      return true;
    }
  });
})();
