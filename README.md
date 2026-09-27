# GreenRah pitch deck

GreenRah: The cooler way. A 15 slide, offline, browser based pitch for stage use.

No internet needed once the files are on the laptop. No CDNs, no web fonts from Google, no analytics, no sound.

## For the event technician

Open this page in Chrome or Edge, then press **F** for fullscreen:

https://yousefebrahimi0.github.io/greenrah-pitch/

If the venue has no internet, download `greenrah-pitch-standalone.html` from the repo and double click it. That one file contains the whole deck.

## Open it

| File | Use it when |
|---|---|
| `greenrah-pitch-standalone.html` | **On stage.** One file with everything inside. Copy it to any laptop and double click. |
| `index.html` | Editing, and the page GitHub Pages serves. |
| `GreenRah-pitch.pdf` | Backup. 15 pages, light theme, every reveal visible. |
| `GreenRah-pitch.pptx` | PowerPoint backup. Dark slides, speaker notes included. |

Use a current Chrome, Edge, Firefox, or Safari. Press **F** for fullscreen.

The deck is designed at 1920 x 1080 and scales to any screen with letterboxing, so the layout never breaks on a projector.

## Keyboard shortcuts

| Action | Keys |
|---|---|
| Next (reveal or slide) | Right, Down, Space, Page Down, Enter, click right side, swipe left |
| Previous | Left, Up, Page Up, click left side, swipe right |
| First / last slide | Home / End |
| Jump to slide | Type the number, then Enter (for example `1` `2` Enter) |
| Overview grid | O (arrows + Enter, or click a slide) |
| Fullscreen | F |
| Dark / light theme | T (dark is the default for projectors) |
| Reduce motion | M (also follows the system setting) |
| Presenter view | S (opens a second window) |
| Black screen | B or `.` |
| Shortcut help | H or ? |
| Close overlays | Esc |

Standard presentation clickers work: they send Page Up / Page Down or arrow keys.

The cursor and the small top toolbar hide after 2 seconds without mouse movement.

Each slide has its own address (`#/1` to `#/15`), so a refresh keeps your place.

## Presenter view

Press **S** on the main window. A second window opens with:

- the current slide (with its current reveal step)
- the next slide
- speaker notes (A- / A+ to resize)
- a timer (starts on your first click; pause and reset buttons) and the clock

Arrow keys, clicker, Previous and Next in either window keep both in sync. Move the presenter window to your laptop screen and the main window to the projector, then press F on the main window.

If nothing opens, allow pop-ups for the file.

## Print or save as PDF

Press Ctrl+P (Cmd+P on Mac) and choose "Save as PDF". You get one slide per page, light theme, all reveals visible. For best results in Chrome or Edge, set margins to "None" and turn on "Background graphics".

Or rebuild the PDF automatically: `node tools/build.mjs --pdf`.

## Edit the words

**All copy lives in `js/content.js`.** You never need to touch the layout code to change words.

- `placeholders`: dates, email, and the investment ask, in one place.
- `stats`: the four "Why now" numbers. A stat only counts up on screen when both `value` and `source` are filled in.
- `slides`: titles, body text, card text, and `notes` (speaker notes) for each slide, in order.
- `ui`: help overlay and presenter view labels.

Formatting inside strings: `{ph:key}` inserts a placeholder, `[[words]]` highlights words in the brand green.

After editing, rebuild the single file:

```
node tools/build.mjs
```

(Requires Node.js 18 or newer. It also refuses to build if any external URL is referenced.)

## Add or replace screenshots

1. Save your images in `assets/` (WebP or PNG; JPG also works).
2. In `js/content.js`, slide `platforms`, set `screenWeb` (laptop, 16:10) and `screenPhone` (phone, about 9:19.5), and update the `alt` text.
3. Run `node tools/build.mjs`.

The current `assets/screen-android.webp` is a phone-size capture of the live web app at greenrah.com/app (Lisbon, 14:00). Replace it with a real Android screenshot if you prefer.

## Folder structure

```
greenrah-pitch/
  index.html                      editing version
  greenrah-pitch-standalone.html  single file for stage use (generated)
  GreenRah-pitch.pdf              PDF backup (generated)
  css/styles.css                  brand tokens, layouts, motion, print
  js/content.js                   ALL text, notes, placeholders
  js/app.js                       presentation engine
  js/city-model.js                illustrative street grid + real Lisbon sun angles
  js/icons.js                     Tabler Icons (outline), inlined SVG
  js/geo-data.js                  Europe map + Lisbon parish grid
  js/vendor/qrcode.js             QR generator (MIT, Kazuhiko Arase), runs locally
  fonts/                          Space Grotesk woff2 (OFL), self-hosted
  assets/                         logos, screenshots, favicon, team photo
  tools/build.mjs                 builds the standalone file (and PDF)
  tools/gen-data.mjs              regenerates icons.js and geo-data.js
```

## How the illustrations work

Slides 1, 2, 4, 6, and 7 use an invented street grid, but the sun angles are real. They are computed for Lisbon on 15 July. Shadows come from building heights and the sun position. On slide 6, the recommended route is simply whichever side street route has the most shade at that time in the drawing. No percentage is shown anywhere. Every map is labelled "Illustration".

The Lisbon grid on slide 13 uses real parish outlines, but the colour values are made up. It is labelled "Not real city data".

## Regenerate icons and maps (optional)

Only needed if you add icons or change the map frame.

```
node tools/gen-data.mjs D:/GreenRah/node_modules/@tabler/icons
```

Inputs expected in `tools/cache/`:

- `ne50.geojson`: Natural Earth 1:50m admin 0 countries (public domain), from github.com/nvkelso/natural-earth-vector
- `freguesias.geojson`: Lisbon parishes (copied from the GreenRah repo, `public/city/lisbon/`)

To add an icon, add its Tabler name to the `ICONS` list in `tools/gen-data.mjs`.

## Accessibility

- Semantic headings, lists, and tables; each slide is a labelled region.
- Slide changes are announced to screen readers (aria-live).
- Visible focus rings; 44 px minimum controls in the toolbar and presenter view.
- Colours follow the GreenRah tokens. Two text-safe additions: `--hot-ink` (a darker amber in light theme so placeholder text meets WCAG AA) and a lighter `--access` blue in dark theme.
- Reduced motion: simple fades only, no drawing or moving animations.

## Credits

- Space Grotesk, SIL Open Font License.
- Tabler Icons, MIT.
- qrcode-generator by Kazuhiko Arase, MIT.
- Natural Earth, public domain.
- Screenshots: GreenRah live product.

Greenrah OÜ · Registry code 17586990 · Tallinn, Estonia
