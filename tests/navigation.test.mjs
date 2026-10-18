import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TOPICS, CHAPTERS } from '../docs/content.js';

const docsDirectory = new URL('../docs/', import.meta.url);
const publicRoot = 'https://wleonardo.github.io/sun-alan-interview-reader/';
const read = name => readFileSync(new URL(name, docsDirectory), 'utf8');
const hubCode = read('hub.js');

function runHub(hash, search = '', page = '') {
  const destinations = [];
  const context = {
    URL,
    window: {
      location: {
        href: publicRoot + page + search + hash,
        search,
        hash,
        replace: destination => destinations.push(destination),
      },
    },
  };
  // A directory visit must never mutate either interview's stored progress.
  for (const key of ['localStorage', 'sessionStorage', 'indexedDB']) {
    const fail = () => { throw new Error(`Navigation touched ${key}`); };
    Object.defineProperty(context, key, { get: fail });
    Object.defineProperty(context.window, key, { get: fail });
  }
  runInNewContext(hubCode, context);
  return destinations;
}

test('all 49 old topic links and 16 old chapter links open the first interview', () => {
  assert.equal(TOPICS.length, 49);
  assert.equal(CHAPTERS.length, 16);
  const ids = [...TOPICS.map(topic => topic.id), ...CHAPTERS.map(chapter => `chapter-${chapter.id}`)];
  for (const id of ids) {
    assert.deepEqual(runHub(`#${id}`), [`${publicRoot}alan.html#${id}`], id);
  }
});

test('legacy redirects preserve query parameters from both root and index.html URLs', () => {
  const query = '?ref=shared&value=%E5%AD%99';
  for (const page of ['', 'index.html']) {
    assert.deepEqual(runHub('#topic-49', query, page), [`${publicRoot}alan.html${query}#topic-49`]);
    assert.deepEqual(runHub('#chapter-16', query, page), [`${publicRoot}alan.html${query}#chapter-16`]);
  }
});

test('ordinary directory anchors and invalid legacy IDs do not redirect', () => {
  for (const hash of ['', '#top', '#interviews', '#topic-00', '#topic-50', '#chapter-00', '#chapter-17', '#topic-1', '#topic-001', '#topic-01-extra', '#chapter-01/other']) {
    assert.deepEqual(runHub(hash), [], hash || 'empty hash');
  }
});

test('the navigation page links to both interviews and does not load the first reader app', () => {
  const hub = read('index.html');
  assert.match(hub, /href="\.\/alan\.html"/);
  assert.match(hub, /href="\.\/jinming\.html"/);
  assert.match(hub, /src="\.\/hub\.js(?:\?[^"]*)?"/);
  assert.doesNotMatch(hub, /src="\.\/app\.js(?:\?[^"]*)?"/);
  const cards = [...hub.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
  const secondCard = cards.find(card => card.includes('href="./jinming.html"'));
  assert.ok(secondCard, 'the second interview has its own navigation card');
  assert.doesNotMatch(secondCard, /完整对话已内置|全文已内置|完整逐字稿已内置|点击展开完整对话/);
});

test('both interview pages provide a link back to the directory', () => {
  for (const file of ['alan.html', 'jinming.html']) {
    assert.match(read(file), /<a\b[^>]*href="\.\/"[^>]*>/, file);
  }
});

test('all HTML local links, assets, and static module imports resolve inside docs', () => {
  const checked = new Set();
  function checkResource(reference, owner) {
    if (!reference.startsWith('.') && !reference.startsWith('#')) return;
    if (reference.startsWith('#')) return;
    const resolved = new URL(reference, new URL(owner, docsDirectory));
    resolved.search = '';
    resolved.hash = '';
    assert.ok(resolved.href.startsWith(docsDirectory.href), `${owner}: ${reference} escapes docs`);
    let stat;
    try { stat = statSync(resolved); }
    catch { assert.fail(`${owner}: missing local resource ${reference}`); }
    if (stat.isDirectory()) {
      resolved.pathname += resolved.pathname.endsWith('/') ? 'index.html' : '/index.html';
      assert.ok(statSync(resolved).isFile(), `${owner}: ${reference} needs an index.html`);
    }
    assert.ok(stat.isFile() || stat.isDirectory(), `${owner}: ${reference} is not a regular file or directory`);
    const relative = resolved.href.slice(docsDirectory.href.length);
    if (relative.endsWith('.js') && !checked.has(relative)) {
      checked.add(relative);
      const source = read(relative);
      for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)) {
        checkResource(match[1], relative);
      }
    }
  }
  for (const file of ['index.html', 'alan.html', 'jinming.html']) {
    for (const match of read(file).matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      checkResource(match[1], file);
    }
  }
});

test('directory and first-interview HTML retain unique IDs and valid ARIA references', () => {
  for (const file of ['index.html', 'alan.html']) {
    const html = read(file);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate IDs`);
    for (const match of html.matchAll(/\b(?:aria-labelledby|aria-describedby)="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), `${file}: missing ARIA target ${id}`);
    }
  }
});

test('moving the first interview preserves its original storage keys and IndexedDB namespace', () => {
  const firstPage = read('alan.html');
  const app = read('app.js');
  assert.match(firstPage, /src="\.\/app\.js(?:\?[^"]*)?"/);
  assert.match(firstPage, /href="\.\/styles\.css(?:\?[^"]*)?"/);
  assert.match(firstPage, /href="\.\/transcript\.md"/);
  assert.match(app, /const READ_KEY = 'longtalk-001-read-v1';/);
  assert.match(app, /const SOURCE_KEY = 'longtalk-001-source-v2';/);
  assert.match(app, /indexedDB\.open\('longtalk-001', 1\)/);
  assert.match(app, /createObjectStore\('transcripts'\)/);
  assert.match(app, /store\.get\('current'\)/);
  assert.deepEqual(runHub(''), []);
  assert.deepEqual(runHub('#topic-01'), [`${publicRoot}alan.html#topic-01`]);
});
