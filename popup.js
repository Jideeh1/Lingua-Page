let currentHost = "";
let currentTabId = null;
let loading = true;
let saveTimer = null;

function applyDarkMode(enabled) {
    document.body.classList.toggle("dark", enabled);
}

function cleanHost(host) {
    return String(host || "")
        .replace(/^www\./, "")
        .toLowerCase();
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    return tab;
}

function setStatus(text) {
    document.getElementById("status").textContent = text;
}

async function getSettings() {
    const response = await chrome.runtime.sendMessage({
        type: "GET_SETTINGS"
    });

    return {
        ...DEFAULT_SETTINGS,
        ...(response || {})
    };
}

function getSettingsFromForm(existingSettings = DEFAULT_SETTINGS) {
    let disabledHosts = existingSettings.disabledHosts || [];
    const siteEnabled = document.getElementById("siteEnabled").checked;

    if (currentHost) {
        disabledHosts = disabledHosts.filter((h) => h !== currentHost);

        if (!siteEnabled) {
            disabledHosts.push(currentHost);
        }
    }

    return {
        enabled: document.getElementById("globalEnabled").checked,
        disabledHosts,
        autoTranslate: document.getElementById("autoTranslate").checked,
        darkMode: document.getElementById("darkMode").checked,
        targetLang:
            document.getElementById("targetLang").value || "en",
        provider: document.getElementById("provider").value,
        libreEndpoint:
            document.getElementById("libreEndpoint").value.trim() ||
            DEFAULT_SETTINGS.libreEndpoint,
        libreApiKey: document.getElementById("libreApiKey").value.trim()
    };
}

function resizePopupAfterAnimation() {
    requestAnimationFrame(() => {
        void document.body.offsetHeight;
    });
}

function setupCollapsible() {
    const section = document.getElementById("libreSettings");
    const trigger = document.getElementById("libreToggle");
    const panel = document.getElementById("librePanel");

    if (!section || !trigger || !panel) return;

    function setOpen(open) {
        trigger.setAttribute("aria-expanded", String(open));
        panel.setAttribute("aria-hidden", String(!open));

        if (open) {
            section.classList.add("open");
            panel.style.maxHeight = `${panel.scrollHeight}px`;
        } else {
            panel.style.maxHeight = `${panel.scrollHeight}px`;

            requestAnimationFrame(() => {
                section.classList.remove("open");
                panel.style.maxHeight = "0px";
            });
        }

        setTimeout(resizePopupAfterAnimation, 280);
    }

    trigger.addEventListener("click", () => {
        setOpen(!section.classList.contains("open"));
    });

    panel.addEventListener("transitionend", () => {
        if (section.classList.contains("open")) {
            panel.style.maxHeight = "none";
        }

        resizePopupAfterAnimation();
    });

    window.addEventListener("resize", () => {
        if (section.classList.contains("open")) {
            panel.style.maxHeight = "none";
        }
    });
}

async function load() {
    setupCollapsible();

    const settings = await getSettings();
    const tab = await getActiveTab();

    currentTabId = tab?.id || null;

    try {
        currentHost = tab?.url
            ? cleanHost(new URL(tab.url).hostname)
            : "";
    } catch (err) {
        currentHost = "";
    }

    document.getElementById("host").textContent = currentHost
        ? `Current site: ${currentHost}`
        : "This page cannot be configured.";

    document.getElementById("globalEnabled").checked =
        Boolean(settings.enabled);

    document.getElementById("siteEnabled").checked = currentHost
        ? !settings.disabledHosts.includes(currentHost)
        : false;

    document.getElementById("siteEnabled").disabled = !currentHost;

    document.getElementById("autoTranslate").checked =
        settings.autoTranslate !== false;

    document.getElementById("darkMode").checked =
        Boolean(settings.darkMode);

    applyDarkMode(Boolean(settings.darkMode));

    document.getElementById("targetLang").value =
        settings.targetLang || "en";

    document.getElementById("provider").value =
        settings.provider || "google";

    document.getElementById("libreEndpoint").value =
        settings.libreEndpoint || DEFAULT_SETTINGS.libreEndpoint;

    document.getElementById("libreApiKey").value =
        settings.libreApiKey || "";

    loading = false;
}

async function save({ auto = false, reload = false } = {}) {
    const existingSettings = await getSettings();
    const settings = getSettingsFromForm(existingSettings);

    const response = await chrome.runtime.sendMessage({
        type: "SAVE_SETTINGS",
        settings
    });

    if (response?.error) {
        return setStatus(response.error);
    }

    setStatus(auto ? "Saved automatically." : "Saved.");

    if (reload && currentTabId) {
        setTimeout(() => chrome.tabs.reload(currentTabId), 250);
    }
}

function scheduleAutoSave({ reload = false } = {}) {
    if (loading) return;

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        save({ auto: true, reload });
    }, 120);
}

async function translateNow() {
    await save();

    if (!currentTabId) {
        return setStatus("No active tab found.");
    }

    try {
        const response = await chrome.tabs.sendMessage(currentTabId, {
            type: "RUN_TRANSLATION_NOW"
        });

        setStatus(
            response?.error
                ? response.error
                : "Translation started."
        );
    } catch (err) {
        setStatus("Reload the page, then try Translate now again.");
    }
}

async function reloadTab() {
    const tab = await getActiveTab();

    if (tab?.id) {
        chrome.tabs.reload(tab.id);
    }
}

document
    .getElementById("save")
    .addEventListener("click", () => save());

document
    .getElementById("translateNow")
    .addEventListener("click", translateNow);

document
    .getElementById("reload")
    .addEventListener("click", reloadTab);

document
    .getElementById("globalEnabled")
    .addEventListener("change", () => {
        scheduleAutoSave({ reload: true });
    });

document
    .getElementById("siteEnabled")
    .addEventListener("change", () => {
        scheduleAutoSave({ reload: true });
    });

document
    .getElementById("autoTranslate")
    .addEventListener("change", () => {
        scheduleAutoSave({ reload: true });
    });

document
    .getElementById("darkMode")
    .addEventListener("change", () => {
        applyDarkMode(document.getElementById("darkMode").checked);
        scheduleAutoSave();
    });

document
    .getElementById("targetLang")
    .addEventListener("change", () => scheduleAutoSave());

document
    .getElementById("provider")
    .addEventListener("change", () => scheduleAutoSave());

document
    .getElementById("libreEndpoint")
    .addEventListener("input", () => scheduleAutoSave());

document
    .getElementById("libreApiKey")
    .addEventListener("input", () => scheduleAutoSave());

load();