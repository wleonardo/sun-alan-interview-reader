// Local-only transcript parser. No network requests and no generated dialogue.
const STAMP = /\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?/;
const SPEAKERS = /^(?:\*{1,2})?(孙宇晨|邵艾伦|艾伦|Alan|Justin(?: Sun)?|主持人|嘉宾|受访者|Speaker\s*\d+)(?:\*{1,2})?\s*[：:]\s*(?:\*{1,2})?/i;

export function parseTime(value) {
  const parts = String(value).replace(',', '.').split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(x => !Number.isFinite(x) || x < 0)) return null;
  if (parts.at(-1) >= 60 || (parts.length === 3 && parts[1] >= 60)) return null;
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}

export function formatTime(value) {
  const seconds = Math.max(0, Math.floor(value));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}

function speakerText(value, defaultSpeaker = '') {
  let text = value.trim();
  // WebVTT voice tags encode the speaker, not HTML to be rendered.
  const voice = text.match(/^<v(?:\.[^ >]+)?\s+([^>]+)>([\s\S]*)/i);
  if (voice) return { speaker: voice[1], text: voice[2].replace(/<\/v>$/i, '').trim() };
  const match = text.match(SPEAKERS);
  if (match) return { speaker: match[1], text: text.slice(match[0].length).trim() };
  return { speaker: defaultSpeaker, text };
}

function timestampLine(line) {
  const match = STAMP.exec(line);
  if (!match || match.index > 70) return null;
  const before = line.slice(0, match.index).replace(/[\s#*_[\]【】()（）>\-]/g, '');
  // Only accept a timestamp at the beginning, or after a speaker label.
  // A time mentioned in normal prose must not create a new dialogue turn.
  if (before && !/^(孙宇晨|邵艾伦|艾伦|Alan|Justin(?:Sun)?|主持人|嘉宾|受访者|Speaker\d+)[：:]?$/i.test(before)) return null;
  const start = parseTime(match[0]);
  if (start === null) return null;
  const rest = line.slice(match.index + match[0].length).replace(/^[\s\]】)）*_\-–—|]+/, '').replace(/^[：:]\s*/, '');
  return { start, rest, speaker: before.replace(/[：:]$/, '') };
}

// The uploaded transcript has explicit Markdown speaker headings. Treat its
// quarter-hour navigation anchors and transcription notes as document structure,
// preserving every actual dialogue turn, including its original uncertainty tags.
function structuredMarkdown(raw, duration) {
  const heading = /^\*\*\[(\d{1,3}:\d{2}(?::\d{2})?)\]\s*([^：:\r\n]+)[：:]\*\*[ \t]*/gm;
  const matches = [...raw.matchAll(heading)];
  if (matches.length < 2) return null;
  const blocks = [];
  let outOfRange = 0;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = parseTime(match[1]);
    const body = raw.slice(match.index + match[0].length, matches[i + 1]?.index ?? raw.length);
    const lines = [];
    const notes = [];
    for (const line of body.split('\n')) {
      if (/^\s*#{1,6}\s+\d{1,3}:\d{2}:\d{2}\s*$/.test(line)) continue;
      if (/^\s*>\s*(?:【校订说明】|说明：)/.test(line)) {
        notes.push({ kind: 'editorial', text: line.replace(/^\s*>\s*/, '').trim() });
      } else if (/^\s*\*\*【(?:节目片花|正片开始)】\*\*\s*$/.test(line)) {
        notes.push({ kind: 'scene', text: line.trim().slice(2, -2) });
      } else if (/^\s*\*（注：部分内容由豆包工作 AI 生成）\*\s*$/.test(line)) {
        notes.push({ kind: 'editorial', text: line.trim().slice(1, -1) });
      } else lines.push(line);
    }
    const text = lines.join('\n').trim();
    if (!text) continue;
    if (start !== null && start >= 0 && start <= duration) {
      blocks.push({ start, speaker: match[2].trim(), text, ...(notes.length ? { notes } : {}) });
    } else outOfRange++;
  }
  const reordered = blocks.some((block, i) => i > 0 && block.start < blocks[i - 1].start);
  blocks.sort((a, b) => a.start - b.start);
  return { blocks, reordered, outOfRange, ignoredPreamble: raw.slice(0, matches[0].index).split('\n').filter(line => line.trim()).length, format: 'Markdown 对话稿' };
}

export function parseTranscript(input, duration = 15748) {
  const raw = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!raw.trim()) throw new Error('文字稿是空的，请先选择文件或粘贴内容。');
  if (raw.length > 8_000_000) throw new Error('文字稿超过 8 MB，请分成较小的文件后导入。');
  const structured = structuredMarkdown(raw, duration);
  if (structured?.blocks.length) return structured;
  const lines = raw.split('\n');
  const cuePattern = /^\s*(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/;
  const isSubtitle = lines.some(line => cuePattern.test(line));
  const blocks = [];
  let current = null;
  let outOfRange = 0;
  let ignoredPreamble = 0;
  function flush() {
    if (!current) return;
    const parsed = speakerText(current.lines.join('\n'), current.speaker);
    if (parsed.text) {
      if (current.start >= 0 && current.start <= duration) {
        blocks.push({ start: current.start, end: current.end, speaker: parsed.speaker, text: parsed.text });
      } else outOfRange++;
    }
    current = null;
  }
  if (isSubtitle) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(cuePattern);
      if (match) {
        flush();
        const start = parseTime(match[1]);
        const end = parseTime(match[2]);
        if (start !== null && end !== null && end >= start) current = { start, end, speaker: '', lines: [] };
      } else if (current) {
        if (!line.trim()) flush();
        else if (!(/^\d+$/.test(line.trim()) && cuePattern.test(lines[i + 1] || ''))) current.lines.push(line);
      }
    }
  } else {
    for (const line of lines) {
      const stamp = timestampLine(line);
      if (stamp) {
        flush();
        current = { start: stamp.start, speaker: stamp.speaker, lines: stamp.rest ? [stamp.rest] : [] };
      } else if (current) current.lines.push(line);
      else if (line.trim()) ignoredPreamble++;
    }
  }
  flush();
  if (!blocks.length) throw new Error('没有找到本场访谈范围内的带时间戳对话。请使用从 00:00:00 起计时的 TXT、Markdown、SRT 或 VTT。');
  const reordered = blocks.some((block, i) => i > 0 && block.start < blocks[i - 1].start);
  blocks.sort((a, b) => a.start - b.start);
  return { blocks, reordered, outOfRange, ignoredPreamble, format: isSubtitle ? '字幕' : '带时间戳文字稿' };
}

export function assignBlocks(blocks, topics) {
  const result = new Map(topics.map(topic => [topic.id, []]));
  for (const block of blocks) {
    const topic = topics.find((t, i) => block.start >= t.start && (block.start < t.end || (i === topics.length - 1 && block.start === t.end)));
    if (topic) result.get(topic.id).push(block);
  }
  return result;
}

export function matchesTopic(topic, query, blocks = []) {
  const haystack = [topic.title, topic.summary, topic.detail, topic.example, topic.note, topic.category,
    ...blocks.map(block => `${block.speaker} ${block.text}`)].join(' ').toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every(term => haystack.includes(term));
}
