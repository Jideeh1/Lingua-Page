# LINGUA PAGES

LINGUA PAGES is a Chrome extension that automatically translates webpages into your chosen target language. It includes global controls, per-site controls, auto-translation, dark mode, and configurable translation providers.

## Features

- **Automatic page translation** — detects non-English pages and translates them automatically.
- **Manual translation fallback** — use the **Translate now** button whenever you want to force translation.
- **Global enable / disable** — turn the extension on or off across the browser.
- **Per-website enable / disable** — disable translation on specific websites such as GitHub, documentation sites, or apps where translation is not needed.
- **Target language selector** — choose the language you want pages translated into.
- **Dark mode** — toggle dark mode for the extension popup.
- **Provider selection** — choose between:
  - Google public translate endpoint
  - LibreTranslate-compatible endpoint
- **LibreTranslate configuration** — set a custom LibreTranslate base URL and optional API key.
- **Saved settings** — preferences are stored with the Chrome extension storage API.

## Installation

### Load as an unpacked Chrome extension

1. Download or clone this repository.
2. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder.
6. Open a webpage and click the LINGUA PAGES extension icon.

## Usage

1. Open the extension popup.
2. Turn on **Enable extension**.
3. Turn on **Enable on this website** if you want translation active on the current site.
4. Turn on **Auto translate pages** to translate pages automatically after they load.
5. Choose a **Target language**.
6. Select a translation provider.
7. Optional: configure LibreTranslate settings if using a LibreTranslate-compatible provider.

## Target language codes

The target language dropdown uses language codes such as:

```text
en      English
es      Spanish
fr      French
de      German
it      Italian
pt      Portuguese
pt-BR   Portuguese — Brazil
ru      Russian
ja      Japanese
ko      Korean
zh      Chinese
zh-Hans Chinese Simplified
zh-Hant Chinese Traditional
ar      Arabic
hi      Hindi
id      Indonesian
tl      Tagalog / Filipino
vi      Vietnamese
th      Thai
nl      Dutch
pl      Polish
tr      Turkish
uk      Ukrainian
```

Provider support can vary. If a language does not work with one provider, try another provider or check whether your LibreTranslate server supports that language pair.

## Project structure

```text
.
├── .github/
│   ├── wordkflow.png
│   │   └──
│   ├── CODE_OF_CONDUCT.md
│   ├── CONTRIBUTING.md
│   └── FUNDING.yml
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── LICENSE
```

## Configuration

The extension stores settings such as:

- enabled / disabled state
- per-site disabled hosts
- auto-translate preference
- dark mode preference
- target language
- translation provider
- LibreTranslate endpoint
- optional LibreTranslate API key

## Notes

- Some browser pages and Chrome internal pages cannot be modified by extensions.
- Some websites render content dynamically, so translation may happen after a short delay.
- LibreTranslate support depends on the specific LibreTranslate server and installed language models.
- The Google public translate endpoint is not an official paid API integration and may change or rate-limit requests.

## Development

After making changes:

1. Go to `chrome://extensions`.
2. Find LINGUA PAGES.
3. Click **Reload**.
4. Refresh the webpage you are testing.

## Roadmap ideas

- Add custom language list editing.
- Add a restore-original-text button.
- Add import/export settings.
- Add per-site target language preferences.
- Add better translation progress UI.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.txt) file for details.
