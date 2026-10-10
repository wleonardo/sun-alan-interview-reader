import { META, CHAPTERS, TOPICS, CATEGORIES } from './content.js';
import { parseTranscript, assignBlocks, matchesTopic, formatTime } from './parser.js';
import { BUNDLED_TRANSCRIPT } from './transcript.js';

const $ = selector => document.querySelector(selector);
const READ_KEY = 'longtalk-001-read-v1';
const SOURCE_KEY = 'longtalk-001-source-v2';
const state = { query: '', category: '', unread: false, open: new Set(), read: new Set(), transcript: BUNDLED_TRANSCRIPT, assigned: assignBlocks(BUNDLED_TRANSCRIPT.blocks, TOPICS), revision: 0, activeChapter: '01' };
try {
  const saved = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
  if (Array.isArray(saved)) state.read = new Set(saved.filter(id => TOPICS.some(t => t.id === id)));
} catch { /* Reading remains available when storage is disabled. */ }

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function external(label, url, className = '') {
  const a = el('a', className, label);
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function button(label, className, action) {
  const b = el('button', className, label); b.type = 'button'; b.addEventListener('click', action); return b;
}
function highlight(node, value) {
  if (!state.query.trim()) { node.textContent = value; return; }
  const terms = state.query.trim().split(/\s+/).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  for (const part of String(value).split(re)) {
    if (!part) continue;
    re.lastIndex = 0;
    node.append(re.test(part) ? el('mark', '', part) : document.createTextNode(part));
  }
}
let toastTimer;
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 5500);
}
function openImport() {
  $('#import-message').textContent = '';
  $('#clear-transcript').hidden = !!state.transcript.bundled;
  $('#import-dialog').showModal();
}

function renderNav() {
  const nav = $('#chapter-nav'); nav.replaceChildren();
  for (const chapter of CHAPTERS) {
    const topic = TOPICS.find(t => t.chapter === chapter.id);
    const link = el('a', 'chapter-link');
    link.href = `#chapter-${chapter.id}`;
    link.dataset.chapter = chapter.id;
    link.append(el('span', 'chapter-number', chapter.id), el('span', '', chapter.title), el('span', 'chapter-time', topic.time.slice(0, 5)));
    link.addEventListener('click', event => {
      event.preventDefault(); resetFilters(false); render();
      history.replaceState(null, '', link.getAttribute('href'));
      document.getElementById(`chapter-${chapter.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveChapter(chapter.id);
    });
    nav.append(link);
  }
  setActiveChapter(state.activeChapter);
}
function setActiveChapter(id) {
  state.activeChapter = id;
  for (const link of document.querySelectorAll('.chapter-link')) {
    const active = link.dataset.chapter === id;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  }
}
function renderFilters() {
  $('#category-filters').replaceChildren();
  for (const category of ['', ...CATEGORIES]) {
    const b = button(category || '全部话题', `filter-button${state.category === category ? ' active' : ''}`, () => {
      state.category = category; renderFilters(); render();
    });
    b.setAttribute('aria-pressed', String(state.category === category));
    $('#category-filters').append(b);
  }
}
function visibleTopics() {
  return TOPICS.filter(topic => (!state.category || topic.category === state.category)
    && (!state.unread || !state.read.has(topic.id))
    && matchesTopic(topic, state.query, state.assigned.get(topic.id) || []));
}
function updateProgress() {
  $('#read-count').textContent = `${state.read.size} / ${TOPICS.length}`;
  $('#read-progress').max = TOPICS.length;
  $('#read-progress').value = state.read.size;
  $('#topic-total').textContent = String(TOPICS.length);
}
function updateExpandButton() {
  const visible = visibleTopics();
  $('#toggle-all').textContent = visible.length && visible.every(t => state.open.has(t.id)) ? '全部收起' : '全部展开';
  $('#toggle-all').disabled = !visible.length;
}
function saveRead() {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...state.read])); }
  catch { toast('浏览器暂时无法保存阅读进度，本次会话仍可使用。'); }
}
function setRead(topic, read, card) {
  if (read) state.read.add(topic.id); else state.read.delete(topic.id);
  saveRead(); updateProgress();
  card.classList.toggle('is-read', read);
  const dot = card.querySelector('.read-dot'); dot.hidden = !read;
  if (state.unread && read) { render(); toast('已标记为已读，并从未读列表移除。'); }
}
function videoURL(seconds) { return `${META.video}&t=${Math.floor(seconds)}s`; }

async function copyTopic(topic) {
  const url = new URL(location.href); url.hash = topic.id;
  try { await navigator.clipboard.writeText(url.href); toast(`已复制话题 ${topic.number} 的链接。`); }
  catch { history.replaceState(null, '', `#${topic.id}`); toast('已定位到当前话题，可复制浏览器地址栏链接。'); }
}

function populateDialogue(container, topic) {
  container.replaceChildren();
  const blocks = state.assigned.get(topic.id) || [];
  if (!blocks.length) {
    const row = el('div', 'dialogue-empty');
    const copy = el('div');
    copy.append(el('strong', '', '替换稿中没有此时间段的对话'));
    copy.append(el('p', '', '可在文字稿设置中恢复内置全文，或选择其他文件。'));
    row.append(copy, button('文字稿设置 ↗', 'text-button', openImport));
    container.append(row); return;
  }
  const heading = el('div', 'dialogue-heading');
  const headingTitle = el('strong', '', '完整对话');
  const headingCount = el('span', '', `${blocks.length} 段`);
  heading.append(headingTitle, headingCount); container.append(heading);
  container.append(el('p', 'dialogue-provenance', state.transcript.bundled
    ? '来自你提供的完整逐字稿 · 保留原话与存疑标记，按段落起始时间归类。'
    : `来自本地替换稿：${state.transcript.name}。内容按起始时间归类，完整程度取决于该文件。`));
  const terms = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matching = terms.length ? blocks.filter(block => terms.some(term => `${block.speaker} ${block.text}`.toLocaleLowerCase().includes(term))) : [];
  let selected = matching.length ? matching : blocks;
  let shown = 0;
  const turns = el('div', 'dialogue-turns');
  const more = button('', 'text-button load-more', () => addTurns());
  const queryNotice = el('div', 'dialogue-search-note');
  function addTurns() {
    const end = state.transcript.bundled ? selected.length : Math.min(shown + 60, selected.length);
    for (let i = shown; i < end; i++) {
      const block = selected[i];
      const turn = el('div', 'dialogue-turn');
      const who = el('div', 'turn-heading');
      if (block.speaker) who.append(el('strong', '', block.speaker));
      who.append(external(formatTime(block.start), videoURL(block.start)));
      const text = el('p', 'turn-text'); highlight(text, block.text);
      turn.append(who, text); turns.append(turn);
      for (const note of block.notes || []) {
        if (note.kind === 'scene') turns.append(el('p', 'scene-marker', note.text));
        else {
          const annotation = el('details', 'transcript-annotation');
          annotation.append(el('summary', '', '转写稿注记（非对话）'), el('p', '', note.text));
          turns.append(annotation);
        }
      }
    }
    shown = end;
    more.hidden = shown >= selected.length;
    more.textContent = `继续显示后续对话（还有 ${selected.length - shown} 段） ↓`;
  }
  if (matching.length) {
    headingTitle.textContent = '与搜索相关的对话'; headingCount.textContent = `${matching.length} / ${blocks.length} 段`;
    queryNotice.append(el('span', '', '当前仅展示关键词匹配段落。'), button('展开本题所有对话', 'text-button', () => {
      selected = blocks; shown = 0; turns.replaceChildren(); queryNotice.hidden = true;
      headingTitle.textContent = '完整对话'; headingCount.textContent = `${blocks.length} 段`; addTurns();
    }));
    container.append(queryNotice);
  }
  container.append(turns, more); addTurns();
}

function createTopic(topic) {
  const chapter = CHAPTERS.find(c => c.id === topic.chapter);
  const card = el('details', `topic-card${state.read.has(topic.id) ? ' is-read' : ''}`);
  card.id = topic.id;
  const summary = el('summary');
  const meta = el('div', 'topic-meta');
  const badge = el('time', 'time-badge', topic.time); badge.dateTime = `PT${topic.start}S`;
  const kind = el('span', 'topic-kind', topic.kind);
  const turns = state.assigned.get(topic.id)?.length || 0;
  if (turns) kind.append(el('span', 'turn-count', `· ${turns} 段对话`));
  const readDot = el('span', 'read-dot'); readDot.hidden = !state.read.has(topic.id); readDot.setAttribute('aria-label', '已读');
  kind.append(readDot); meta.append(badge, kind);
  const copy = el('div', 'topic-copy');
  const title = el('h3', 'topic-title'); highlight(title, topic.title);
  const desc = el('p', 'topic-summary'); highlight(desc, topic.summary);
  copy.append(title, desc);
  const icon = el('span', 'expand-icon'); icon.setAttribute('aria-hidden', 'true');
  summary.append(meta, copy, icon); card.append(summary);
  const body = el('div', 'topic-body');
  const detail = el('p', 'editorial-detail'); highlight(detail, topic.detail); body.append(detail);
  if (topic.example) {
    const example = el('div', 'example-box');
    const label = el('span', 'example-label', '具体例子');
    const p = el('p'); highlight(p, topic.example); example.append(label, p); body.append(example);
  }
  if (topic.note) { const note = el('p', 'topic-note'); highlight(note, topic.note); body.append(note); }
  const actions = el('div', 'topic-actions');
  actions.append(external('▶ 从这里看视频', videoURL(topic.start)), external('公开原文 ↗', chapter.source), button('复制话题链接', 'text-button', () => copyTopic(topic)));
  body.append(actions);
  const dialogue = el('div', 'dialogue-area'); body.append(dialogue);
  const bottom = el('div', 'topic-bottom');
  const readLabel = el('label', 'read-toggle');
  const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = state.read.has(topic.id);
  checkbox.addEventListener('change', () => setRead(topic, checkbox.checked, card));
  readLabel.append(checkbox, document.createTextNode('标记为已读'));
  bottom.append(readLabel, el('span', '', `${topic.time} — ${formatTime(topic.end)}`)); body.append(bottom); card.append(body);
  let populatedRevision = -1;
  card.addEventListener('toggle', () => {
    if (!card.isConnected) return;
    if (card.open) {
      state.open.add(topic.id);
      if (populatedRevision !== state.revision) { populateDialogue(dialogue, topic); populatedRevision = state.revision; }
    } else state.open.delete(topic.id);
    updateExpandButton();
  });
  card.open = state.open.has(topic.id);
  if (card.open) { populateDialogue(dialogue, topic); populatedRevision = state.revision; }
  return card;
}

let chapterObserver;
function render() {
  const topics = visibleTopics();
  const root = $('#topics');
  // Detached details can emit queued toggle events; their handlers ignore them.
  root.replaceChildren();
  for (const chapter of CHAPTERS) {
    const list = topics.filter(topic => topic.chapter === chapter.id);
    if (!list.length) continue;
    const group = el('section', 'chapter-group'); group.id = `chapter-${chapter.id}`;
    const heading = el('div', 'chapter-section-heading');
    heading.append(el('span', 'chapter-index', chapter.id), el('h2', '', chapter.title), el('span', 'chapter-context', `${list.length} 个话题 · ${list[0].time.slice(0, 5)}`));
    group.append(heading, ...list.map(createTopic)); root.append(group);
  }
  $('#empty-state').hidden = !!topics.length;
  const activeFilter = !!state.query || !!state.category || state.unread;
  $('#result-count').textContent = activeFilter ? `找到 ${topics.length} / ${TOPICS.length} 个话题 · 按时间顺序` : `全部 ${TOPICS.length} 个话题 · 按时间顺序`;
  updateProgress(); updateExpandButton();
  chapterObserver?.disconnect();
  if ('IntersectionObserver' in window) {
    chapterObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActiveChapter(entry.target.id.replace('chapter-', ''));
    }, { rootMargin: '-10% 0px -72% 0px', threshold: 0 });
    for (const group of root.querySelectorAll('.chapter-group')) chapterObserver.observe(group);
  }
}

function resetFilters(shouldRender = true) {
  state.query = ''; state.category = ''; state.unread = false;
  $('#search').value = ''; $('#unread-only').checked = false;
  state.revision++; renderFilters(); if (shouldRender) render();
}
function handleHash() {
  const targetId = location.hash.slice(1);
  const topic = TOPICS.find(t => t.id === targetId);
  const chapter = CHAPTERS.find(c => `chapter-${c.id}` === targetId);
  if (!topic && !chapter) return;
  resetFilters(false);
  if (topic) state.open.add(topic.id);
  render();
  requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: 'start' }));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('storage unavailable')); return; }
    const request = indexedDB.open('longtalk-001', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('transcripts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('storage blocked'));
  });
}
async function transcriptStorage(action, value) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('transcripts', action === 'get' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('transcripts');
      const request = action === 'get' ? store.get('current') : action === 'delete' ? store.delete('current') : store.put(value, 'current');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function applyTranscript(value) {
  value = value || BUNDLED_TRANSCRIPT;
  state.transcript = value;
  state.assigned = assignBlocks(value.blocks, TOPICS);
  state.revision++;
  $('#clear-transcript').hidden = !!value.bundled;
  $('#search').placeholder = '搜索问题、观点或完整对话…';
  if (value.bundled) {
    $('#transcript-status').textContent = `全文已内置 · ${value.blocks.length} 段对话已对应到 ${TOPICS.length} 个话题`;
    $('#transcript-description').textContent = '点击任意话题即可展开完整对话，无需导入。保留原稿说话人、时间戳、口语重复与存疑标记。';
  } else {
    const covered = [...state.assigned.values()].filter(blocks => blocks.length).length;
    $('#transcript-status').textContent = `当前使用本地替换稿 · ${covered} / ${TOPICS.length} 个话题有对应文字`;
    $('#transcript-description').textContent = `${value.name} · ${value.blocks.length} 段，时间戳 ${formatTime(value.blocks[0].start)}—${formatTime(value.blocks.at(-1).start)}。可在“更换文字稿”中恢复内置全文。`;
  }
  render();
}

let pendingFile = null;
let importVersion = 0;
$('#transcript-file').addEventListener('change', event => {
  pendingFile = event.target.files?.[0] || null;
  $('#file-label').textContent = pendingFile ? pendingFile.name : '选择文字稿文件';
  $('#import-message').textContent = pendingFile ? '已选择文件；点击“解析并使用”继续。' : '';
  if (pendingFile) $('#transcript-paste').value = '';
});
$('#transcript-paste').addEventListener('input', () => {
  if ($('#transcript-paste').value && pendingFile) {
    pendingFile = null; $('#transcript-file').value = ''; $('#file-label').textContent = '选择文字稿文件';
  }
});
$('#confirm-import').addEventListener('click', async () => {
  const confirm = $('#confirm-import'); confirm.disabled = true;
  $('#import-message').textContent = '正在解析…';
  try {
    if (pendingFile && pendingFile.size > 8_000_000) throw new Error('文件超过 8 MB，请拆分后再导入。');
    const text = pendingFile ? await pendingFile.text() : $('#transcript-paste').value;
    const parsed = parseTranscript(text, META.duration);
    const transcript = { name: pendingFile?.name || '粘贴的文字稿', blocks: parsed.blocks, importedAt: Date.now() };
    let persistent = true;
    try { await transcriptStorage('put', transcript); localStorage.setItem(SOURCE_KEY, 'local'); } catch { persistent = false; }
    importVersion++; applyTranscript(transcript);
    $('#import-dialog').close();
    const notices = [persistent ? '替换稿已在此浏览器保存。' : '替换稿仅在本次会话使用；浏览器无法保存这一选择。'];
    if (parsed.reordered) notices.push('已按时间重新排序。');
    if (parsed.outOfRange) notices.push(`忽略 ${parsed.outOfRange} 段超出访谈时长的文字。`);
    if (parsed.ignoredPreamble) notices.push('首次时间戳之前的说明未纳入对话。');
    toast(notices.join(''));
  } catch (error) { $('#import-message').textContent = error.message || '导入失败，请检查文件格式。'; }
  finally { confirm.disabled = false; }
});
$('#clear-transcript').addEventListener('click', async () => {
  $('#clear-transcript').disabled = true;
  try {
    await transcriptStorage('delete');
    try { localStorage.setItem(SOURCE_KEY, 'bundled'); } catch { /* The deleted override cannot be restored. */ }
    importVersion++; applyTranscript(null);
    pendingFile = null; $('#transcript-file').value = ''; $('#transcript-paste').value = ''; $('#file-label').textContent = '选择文字稿文件';
    $('#import-dialog').close(); toast('已恢复内置全文，阅读进度保留。');
  } catch {
    try { localStorage.setItem(SOURCE_KEY, 'bundled'); } catch { /* Current-session fallback is still available. */ }
    importVersion++; applyTranscript(null);
    $('#import-message').textContent = '已恢复内置全文；但无法确认本地替换稿已从浏览器存储删除。可通过浏览器清除此站点数据。';
  } finally { $('#clear-transcript').disabled = false; }
});

for (const b of document.querySelectorAll('[data-import]')) b.addEventListener('click', openImport);
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
}
$('#show-format').addEventListener('click', () => {
  const help = $('#format-help'); help.hidden = !help.hidden;
  $('#show-format').setAttribute('aria-expanded', String(!help.hidden));
});
for (const id of ['#open-sources', '#footer-sources']) $(id).addEventListener('click', () => $('#sources-dialog').showModal());
let searchTimer;
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.query = $('#search').value; state.revision++; render(); }, 120);
});
document.addEventListener('keydown', event => {
  const tag = event.target.tagName;
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(tag) && !event.target.isContentEditable && !document.querySelector('dialog[open]')) {
    event.preventDefault(); $('#search').focus();
  }
});
$('#unread-only').addEventListener('change', () => { state.unread = $('#unread-only').checked; render(); });
$('#toggle-all').addEventListener('click', () => {
  const topics = visibleTopics();
  const close = topics.every(t => state.open.has(t.id));
  for (const topic of topics) { if (close) state.open.delete(topic.id); else state.open.add(topic.id); }
  for (const card of document.querySelectorAll('.topic-card')) card.open = !close;
  updateExpandButton();
});
$('#reset-filters').addEventListener('click', () => resetFilters());
$('#reset-progress').addEventListener('click', () => { state.read.clear(); saveRead(); render(); toast('阅读进度已重置。'); });
window.addEventListener('hashchange', handleHash);

renderNav(); renderFilters(); applyTranscript(BUNDLED_TRANSCRIPT); handleHash();
const restoreVersion = importVersion;
let restoreLocal = false;
try { restoreLocal = localStorage.getItem(SOURCE_KEY) === 'local'; } catch { /* The bundled full transcript is always available. */ }
if (restoreLocal) transcriptStorage('get').then(value => {
  if (restoreVersion !== importVersion || !value?.blocks?.length) return;
  const valid = value.blocks.every(block => Number.isFinite(block.start) && block.start >= 0 && block.start <= META.duration && typeof block.text === 'string' && typeof block.speaker === 'string');
  if (valid) applyTranscript({ ...value, bundled: false });
}).catch(() => { /* Local storage failure never blocks the bundled transcript. */ });
