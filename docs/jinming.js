import { META, TOPICS, SECTIONS, searchTopics, splitLocalText } from './jinming-content.js';

export const READ_KEY = 'longtalk-002-read-v1';
const $ = id => document.getElementById(id);
const state = { query: '', category: '全部', unreadOnly: false, read: new Set(), open: new Set() };
let toastTimer;
function notice(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500); }
try { const saved = JSON.parse(localStorage.getItem(READ_KEY) || '[]'); if (Array.isArray(saved)) state.read = new Set(saved.filter(id => TOPICS.some(t => t.id === id))); } catch { /* A blocked store must not prevent reading. */ }
function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
function link(text, href) { const a = el('a', '', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function saveProgress() { try { localStorage.setItem(READ_KEY, JSON.stringify([...state.read])); } catch { notice('浏览器阻止了保存；本次进度仍可在当前页面使用。'); } }
function progress() { $('read-count').textContent = `${state.read.size} / ${TOPICS.length}`; $('read-progress').value = state.read.size; }

function card(topic) {
  const details = el('details', `topic-card${state.read.has(topic.id) ? ' is-read' : ''}`); details.id = topic.id; details.open = state.open.has(topic.id);
  details.addEventListener('toggle', () => { if (details.isConnected) { if (details.open) state.open.add(topic.id); else state.open.delete(topic.id); syncExpand(); } });
  const summary = el('summary');
  const meta = el('span', 'topic-meta'); meta.append(el('span', 'time-badge', String(topic.order).padStart(2, '0')), el('span', 'topic-kind', topic.category));
  const copy = el('div', 'topic-copy'); copy.append(el('h3', 'topic-title', topic.title), el('p', 'topic-summary', `核心内容 · ${topic.summary}`));
  const icon = el('span', 'expand-icon'); icon.setAttribute('aria-hidden', 'true'); summary.append(meta, copy, icon);
  const body = el('div', 'topic-body'); body.append(el('strong', 'guide-label', '编辑阅读提示 · 非受访者原话'), el('p', 'review-copy', topic.review));
  if (topic.example) { const box = el('div', 'example-box'); box.append(el('span', 'example-label', '提及例子'), el('p', '', topic.example)); body.append(box); }
  if (topic.quote) { const quote = el('blockquote', 'guide-quote', `“${topic.quote}”`); quote.append(el('footer', '', '孙宇晨 · 据公开转写摘录，仍以原视频为准')); body.append(quote); }
  const prompt = el('p', 'source-prompt', '本话题的完整对话尚未内置。请到 '); prompt.append(link('文字来源的 Full transcript', META.transcript), document.createTextNode(' 查阅，或观看原节目。'));
  body.append(prompt);
  const actions = el('div', 'topic-actions'); actions.append(link('原节目 ↗', META.video), link('文字来源 ↗', META.transcript));
  const permalink = el('button', 'text-button', '复制话题链接'); permalink.type = 'button'; permalink.addEventListener('click', async () => { const url = new URL(location.href); url.hash = topic.id; try { await navigator.clipboard.writeText(url.href); notice('话题链接已复制。'); } catch { history.replaceState(null, '', url); notice('无法自动复制；地址栏已定位到本话题，可手动复制。'); } }); actions.append(permalink); body.append(actions);
  const bottom = el('div', 'topic-bottom'); const label = el('label', 'read-toggle'); const check = el('input'); check.type = 'checkbox'; check.checked = state.read.has(topic.id); check.setAttribute('aria-label', `将“${topic.title}”标记为已读`);
  check.addEventListener('change', () => { if (check.checked) state.read.add(topic.id); else state.read.delete(topic.id); details.classList.toggle('is-read', check.checked); saveProgress(); progress(); if (state.unreadOnly) { const before = searchTopics(state); render(); const next = before.find(t => t.order > topic.order) || before[0]; (next ? $(next.id)?.querySelector('summary') : $('unread-only'))?.focus(); } });
  label.append(check, document.createTextNode(' 标记已读')); bottom.append(label, el('span', '', `顺序 ${String(topic.order).padStart(2, '0')} / 20`)); body.append(bottom); details.append(summary, body); return details;
}

function syncExpand() { const visible = [...$('topics').querySelectorAll('.topic-card')]; $('toggle-all').textContent = visible.length && visible.every(d => d.open) ? '全部收起' : '全部展开'; $('toggle-all').disabled = !visible.length; }
function render() {
  const matches = searchTopics(state); $('topics').replaceChildren();
  SECTIONS.forEach((section, index) => { const groupTopics = matches.filter(t => t.section === index); if (!groupTopics.length) return; const group = el('section', 'chapter-group'); group.id = section.id; const heading = el('div', 'chapter-section-heading'); heading.append(el('span', 'chapter-index', String(index + 1).padStart(2, '0')), el('h2', '', section.title), el('span', 'chapter-context', `顺序 ${section.range}`)); group.append(heading, ...groupTopics.map(card)); $('topics').append(group); });
  $('result-count').textContent = `${matches.length} / ${TOPICS.length} 个话题 · 按对话顺序`;
  $('empty-state').hidden = matches.length > 0;
  document.querySelectorAll('[data-category]').forEach(button => { const active = button.dataset.category === state.category; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  progress(); syncExpand();
}
function clearFilters() { state.query = ''; state.category = '全部'; state.unreadOnly = false; $('search').value = ''; $('unread-only').checked = false; render(); }
function openHash() { const topic = TOPICS.find(t => `#${t.id}` === location.hash); if (!topic) return; clearFilters(); state.open.add(topic.id); const target = $(topic.id); target.open = true; target.scrollIntoView({ block: 'start' }); }
for (const [index, section] of SECTIONS.entries()) { const a = el('a', 'chapter-link'); a.href = `#${section.id}`; a.append(el('span', 'chapter-number', String(index + 1).padStart(2, '0')), el('span', '', section.title)); a.addEventListener('click', () => { clearFilters(); }); $('chapter-nav').append(a); }
for (const category of ['全部', ...new Set(TOPICS.map(t => t.category))]) { const button = el('button', 'filter-button', category); button.type = 'button'; button.dataset.category = category; button.addEventListener('click', () => { state.category = category; render(); }); $('category-filters').append(button); }
$('search').addEventListener('input', e => { state.query = e.target.value; render(); });
$('unread-only').addEventListener('change', e => { state.unreadOnly = e.target.checked; render(); });
$('toggle-all').addEventListener('click', () => { const cards = [...$('topics').querySelectorAll('.topic-card')]; const open = !cards.every(d => d.open); for (const d of cards) { d.open = open; if (open) state.open.add(d.id); else state.open.delete(d.id); } syncExpand(); });
$('clear-filters').addEventListener('click', clearFilters);
$('reset-progress').addEventListener('click', () => { if (!state.read.size || !confirm('仅重置本场的阅读进度？第一场不受影响。')) return; state.read.clear(); saveProgress(); render(); notice('本场进度已重置。'); });
window.addEventListener('hashchange', openHash);
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); $('search').focus(); } });

let paragraphs = [], shown = 30, fileVersion = 0;
function renderLocal() { const query = $('local-search').value.trim().toLocaleLowerCase(); const selected = paragraphs.filter(p => p.toLocaleLowerCase().includes(query)); $('local-text').replaceChildren(...selected.slice(0, shown).map(p => { const paragraph = el('p', 'local-paragraph', p); paragraph.tabIndex = 0; return paragraph; })); $('local-count').textContent = `${selected.length} 段匹配 / ${paragraphs.length} 段；显示 ${Math.min(shown, selected.length)} 段`; $('local-more').hidden = shown >= selected.length; }
$('local-file').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; const version = ++fileVersion; if (!/\.(txt|md|srt|vtt)$/iu.test(file.name) || file.size > 8 * 1024 * 1024) { $('local-status').textContent = '请选择不超过 8 MB 的 TXT、MD、SRT 或 VTT 文件；已有内容未改变。'; e.target.value = ''; return; } try { const buffer = await file.arrayBuffer(); if (version !== fileVersion) return; let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { throw new Error('文件不是有效的 UTF-8，请转换编码后重试。'); } if (!text.trim() || text.includes('\0')) throw new Error('请选择非空 UTF-8 纯文本文件。'); paragraphs = splitLocalText(text); shown = 30; $('local-search').value = ''; $('local-controls').hidden = false; $('local-status').textContent = `已临时导入 ${file.name}；刷新即清除，未上传，未自动对应到话题。`; renderLocal(); } catch (error) { if (version === fileVersion) $('local-status').textContent = `无法读取：${error.message} 已有内容未改变。`; } e.target.value = ''; });
$('local-search').addEventListener('input', () => { shown = 30; renderLocal(); });
$('local-more').addEventListener('click', () => { shown += 30; renderLocal(); });
$('clear-local').addEventListener('click', () => { fileVersion++; paragraphs = []; $('local-search').value = ''; $('local-controls').hidden = true; $('local-text').replaceChildren(); $('local-more').hidden = true; $('local-status').textContent = '本地文字已清除，未上传。'; $('local-file').focus(); });
render(); openHash();
