// Preserve links shared when the first interview occupied the site root.
// This does not read or change either interview's reading-progress storage.
(function preserveFirstInterviewLinks() {
  const match = /^#(topic|chapter)-(\d{2})$/.exec(window.location.hash);
  if (!match) return;
  const number = Number(match[2]);
  const maximum = match[1] === 'topic' ? 49 : 16;
  if (number < 1 || number > maximum) return;
  const destination = new URL('./alan.html', window.location.href);
  destination.search = window.location.search;
  destination.hash = window.location.hash;
  window.location.replace(destination.href);
})();
