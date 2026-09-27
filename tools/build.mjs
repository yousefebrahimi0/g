// Builds g.html: one file with CSS, JS, fonts, icons,
// map data and images inlined (base64). Works offline on any laptop.
//
//   node tools/build.mjs          build the standalone HTML
//   node tools/build.mjs --pdf    also print f/g.pdf with headless Chrome or Edge
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2' };

function dataUri(rel) {
  const file = path.join(root, rel);
  const ext = path.extname(file).slice(1).toLowerCase();
  return `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}`;
}

// assets/... references inside CSS / JS / HTML become data URIs
const inlineAssets = (text) => text.replace(/assets\/[\w.-]+\.(png|webp|jpe?g|svg)/g, (m) => dataUri(m));

let css = read('css/styles.css').replace(/url\("\.\.\/fonts\/([\w.-]+\.woff2)"\)/g, (_, f) => `url("${dataUri('fonts/' + f)}")`);
css = inlineAssets(css);

let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="css/styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace(/<link rel="icon" href="(assets\/[^"]+)">/, (_, p) => `<link rel="icon" href="${dataUri(p)}">`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => {
  const js = inlineAssets(read(p)).replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ---- ${p} ---- */\n${js}\n</script>`;
});
// Strict CSP: the single file may not load anything from the network.
html = html.replace(
  '<meta charset="utf-8">',
  '<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'">'
);

// Guard: no external URLs may be loaded by the built file.
const external = html.match(/(?:src|href)\s*=\s*["']https?:\/\//gi) || [];
const cssExternal = html.match(/url\(\s*["']?https?:\/\//gi) || [];
if (external.length || cssExternal.length) {
  console.error('External resource references found:', external.concat(cssExternal));
  process.exit(1);
}

const out = path.join(root, 'g.html');
fs.writeFileSync(out, html);
console.log(`standalone: ${(fs.statSync(out).size / 1024).toFixed(0)} KB -> ${out}`);

if (process.argv.includes('--pdf')) {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];
  const browser = candidates.find((c) => fs.existsSync(c));
  if (!browser) { console.error('No Chrome or Edge found for PDF export.'); process.exit(1); }
  const pdf = path.join(root, 'f', 'g.pdf');
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000',
    `--print-to-pdf=${pdf}`, pathToFileURL(out).href + '#/1'], { stdio: 'inherit' });
  console.log(`pdf: ${pdf}`);
}
