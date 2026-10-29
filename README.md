# pumaweb

PuMA web repository for http://puma.iar.unlp.edu.ar/

Static site (no build step, no jQuery/Bootstrap). Bilingual EN/ES with a language selector, light/dark theme.

## Structure
- `index.html` — page skeleton and English text (`data-i18n` attributes)
- `js/data.js` — **all lists live here**: ATels, publications (papers, proceedings, preprints, LVK), team, collaborators
- `js/i18n.js` — Spanish translations, topic descriptions and UI strings
- `js/main.js` — filters, language, theme, rendering
- `js/hero.js` — pulse animation in the hero
- `css/style.css`, `fonts/` (self-hosted), `images/`

## How to add a new ATel
In `js/data.js`, add an object at the top of the `atels` list:

    {"num": 17999, "date": "2026-11-20", "object": "PSR J0835−4510", "topics": ["glitches"],
     "title": "…official ATel title…", "summary": {"en": "A new glitch.", "es": "Un nuevo glitch."}}

Valid topics: `glitches`, `magnetars`, `frbs`, `single-pulses`, `msp`, `gw`. The link is built from `num`.

## How to add a paper
Add an object to `pubs` (keep newest first): `year`, `type` (`journal` | `preprint` | `proceedings` | `lvk`),
`title`, `authors` (list), `venue`, `topics`, `arxiv` and, if it has one, `doi`.

## Contacts
The two contact people (Carlos Lousto, Federico García) are in `contacts` inside `js/data.js`.

## Pulsar animation
`images/pulsar.gif` (reduced-motion users get `images/pulsar-poster.jpg`). It was generated with a script; ask for it if you want to change it.

## Team photos
Square photos in `images/team/`, ~480 px. Add the person in `people` inside `js/data.js`.
