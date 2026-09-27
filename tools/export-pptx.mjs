// Screenshots the dark deck (all reveals visible) and builds GreenRah-pitch.pptx
// with speaker notes. Run after tools/build.mjs so the standalone file is current.
//
//   node tools/export-pptx.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import PptxGenJS from 'pptxgenjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const html = path.join(root, 'greenrah-pitch-standalone.html');
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
const browser = candidates.find((c) => fs.existsSync(c));
if (!browser) throw new Error('No Chrome or Edge found');

const port = 9333;
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gr-pitch-'));
const chrome = spawn(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--window-size=1920,1080`,
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDir}`,
  'about:blank'
], { stdio: 'ignore' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function pageSocket() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* chrome still starting */ }
    await sleep(150);
  }
  throw new Error('Chrome debugger did not start');
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

const REVEAL = `(() => {
  document.documentElement.classList.add('reduce-motion');
  document.documentElement.setAttribute('data-theme', 'dark');
  const bar = document.querySelector('.toolbar');
  if (bar) bar.style.display = 'none';
  const el = document.querySelector('.slide.is-active');
  if (!el) return false;
  for (let k = 1; k <= 9; k++) el.classList.add('s' + k);
  el.querySelectorAll('.frag').forEach((f) => f.classList.add('is-shown'));
  el.querySelectorAll('.stagger').forEach((f) => { f.style.opacity = '1'; f.style.transform = 'none'; });
  return true;
})()`;

const ws = new WebSocket(await pageSocket());
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
const call = cdp(ws);

await call('Page.enable');
await call('Runtime.enable');
await call('Emulation.setDeviceMetricsOverride', {
  width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
});
await call('Page.addScriptToEvaluateOnNewDocument', {
  source: "try{localStorage.setItem('gr-motion','reduce')}catch(e){} document.documentElement.classList.add('reduce-motion');"
});

const fileUrl = pathToFileURL(html).href;
await call('Page.navigate', { url: fileUrl + '#/1' });
await sleep(800);
await call('Runtime.evaluate', {
  expression: "localStorage.setItem('gr-motion','reduce')",
  returnByValue: true
});

const notesResult = await call('Runtime.evaluate', {
  expression: 'JSON.stringify(window.GR_CONTENT.slides.map(s => s.notes || ""))',
  returnByValue: true
});
const notes = JSON.parse(notesResult.result.value);
const shots = [];

for (let i = 0; i < notes.length; i++) {
  await call('Page.navigate', { url: fileUrl + '#/' + (i + 1) });
  await sleep(700);
  await call('Runtime.evaluate', { expression: REVEAL, returnByValue: true });
  await sleep(250);
  const shot = await call('Page.captureScreenshot', { format: 'png' });
  shots.push(Buffer.from(shot.data, 'base64'));
  console.log('slide', i + 1);
}

ws.close();
chrome.kill();

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'DECK', width: 13.333, height: 7.5 });
pptx.layout = 'DECK';
pptx.title = 'GreenRah: The cooler way';
pptx.author = 'Greenrah OÜ';
pptx.subject = 'GreenRah pitch';

shots.forEach((buf, i) => {
  const slide = pptx.addSlide();
  slide.addImage({ data: 'image/png;base64,' + buf.toString('base64'), x: 0, y: 0, w: 13.333, h: 7.5 });
  if (notes[i]) slide.addNotes(notes[i]);
});

const out = path.join(root, 'GreenRah-pitch.pptx');
await pptx.writeFile({ fileName: out });
console.log('pptx:', out);
try { fs.rmSync(userDir, { recursive: true, force: true }); } catch { /* temp profile */ }
