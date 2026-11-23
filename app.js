(() => {
const $ = id => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const rd = k => { try { return localStorage.getItem(k); } catch { return null; } };
const wr = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const now = () => Date.now();
const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);
const CRLF = String.fromCharCode(13, 10);
const DAY = 864e5;
const CID = window.SOULNOTE_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE = 'soulnote.json';

const norm = n => {
  const c = n.created || (+n.id > 1e12 ? +n.id : now());
  return { id: String(n.id), heading: n.heading || 'Untitled', text: n.text || '', tags: Array.isArray(n.tags) ? n.tags.map(String) : [], pinned: !!n.pinned, created: c, updated: n.updated || c, trashed: n.trashed || 0, purged: !!n.purged };
};

let notes = [];
if (rd('soulnotes') === null) notes = [{ id: uid(), heading: 'Welcome to SoulNote', text: 'Press Ctrl+O to create a new note.' }];
else try { notes = JSON.parse(rd('soulnotes')); } catch { wr('soulnotes-corrupt-backup', rd('soulnotes')); }
notes = (Array.isArray(notes) ? notes : []).filter(n => n && n.id != null).map(norm);

let view = 'notes', query = '', active = null, snap = null, fresh = false;
let autoT, syncT, syncing = false, token = null, tokenExp = 0, tc = null;

const touch = n => { n.updated = now(); };
const purge = n => { Object.assign(n, { heading: '', text: '', tags: [], pinned: false, purged: true, trashed: n.trashed || now() }); touch(n); };
const save = () => { wr('soulnotes', JSON.stringify(notes)); queueSync(); };

function merge(list) {
  const m = new Map(notes.map(n => [n.id, n]));
  list.forEach(r => { const x = norm(r), l = m.get(x.id); if (!l || x.updated > l.updated) m.set(x.id, x); });
  notes = [...m.values()];
}

function download(name, text, type) {
  const a = el('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- render ---------- */
function card(n, trash) {
  const box = el('div', 'clickable'), prev = el('div', 'note-preview'), acts = el('div', 'card-actions');
  prev.append(el('h1', '', (n.pinned ? '📌 ' : '') + n.heading), el('p', '', n.text || 'Empty note...'), el('p', 'meta', [new Date(n.updated).toLocaleDateString(), ...n.tags.map(t => '#' + t)].join('  ')));
  const btn = (label, title, fn) => { const b = el('span', 'delete-btn', label); b.title = title; b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
  if (trash) {
    acts.append(btn('↩', 'Restore', () => { n.trashed = 0; touch(n); save(); render(); }), btn('✕', 'Delete forever', () => { if (confirm('Delete this note forever?')) { purge(n); save(); render(); } }));
  } else {
    acts.append(btn('✕', 'Move to trash', () => { n.trashed = now(); touch(n); save(); render(); }));
    prev.onclick = () => openModal(n);
  }
  box.append(prev, acts);
  return box;
}

function render() {
  const c = $('container'), trash = view === 'trash', q = query.trim().toLowerCase();
  c.replaceChildren();
  notes.filter(n => !n.purged && !!n.trashed === trash && (!q || (n.heading + ' ' + n.text + ' ' + n.tags.join(' ')).toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned - a.pinned) || b.updated - a.updated)
    .forEach(n => c.appendChild(card(n, trash)));
  if (!c.children.length) c.appendChild(el('p', 'empty', trash ? 'Trash is empty.' : q ? 'No matches.' : 'No notes yet.'));
  $('view-toggle').textContent = trash ? '← Notes' : 'Trash (' + notes.filter(n => !n.purged && n.trashed).length + ')';
}

/* ---------- modal ---------- */
function openModal(n, isNew) {
  active = n; fresh = !!isNew;
  snap = { heading: n.heading, text: n.text, tags: [...n.tags], pinned: n.pinned };
  $('modal-heading').value = n.heading;
  $('modal-body').value = n.text;
  $('modal-tags').value = n.tags.join(', ');
  $('modal-pin').textContent = n.pinned ? '📌 Pinned' : 'Pin';
  $('modal-overlay').classList.add('open');
  setTimeout(() => $('modal-body').focus(), 100);
}
function readModal() {
  if (!active) return;
  active.heading = $('modal-heading').value || 'Untitled';
  active.text = $('modal-body').value;
  active.tags = $('modal-tags').value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
  touch(active);
}
function hideModal() { clearTimeout(autoT); $('modal-overlay').classList.remove('open'); active = null; render(); }
function closeModal() { if (active) { readModal(); save(); } hideModal(); }
function discard() {
  if (active) { if (fresh) purge(active); else { Object.assign(active, snap); touch(active); } save(); }
  hideModal();
}
function newNote() {
  const n = norm({ id: uid(), heading: 'New Note', text: '', created: now(), updated: now() });
  notes.push(n); save(); render(); openModal(n, true);
}
const auto = () => { clearTimeout(autoT); autoT = setTimeout(() => { if (active) { readModal(); save(); } }, 600); };
['modal-heading', 'modal-body', 'modal-tags'].forEach(id => $(id).addEventListener('input', auto));

$('modal-pin').onclick = () => { if (!active) return; active.pinned = !active.pinned; $('modal-pin').textContent = active.pinned ? '📌 Pinned' : 'Pin'; auto(); };
$('modal-md').onclick = () => { if (!active) return; readModal(); download((active.heading.replace(/[^a-z0-9]+/gi, '_') || 'note') + '.md', '# ' + active.heading + '\n\n' + active.text + '\n', 'text/markdown'); };
$('modal-save').onclick = closeModal;
$('modal-close').onclick = closeModal;
$('modal-discard').onclick = discard;
$('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
$('add-btn').onclick = newNote;
$('search').oninput = e => { query = e.target.value; render(); };
$('view-toggle').onclick = () => { view = view === 'trash' ? 'notes' : 'trash'; render(); };

/* ---------- settings ---------- */
const bg = rd('soulnotes-bg');
if (bg) { document.documentElement.style.setProperty('--bg-color', bg); $('bg-color-picker').value = bg; }
$('bg-color-picker').addEventListener('input', e => { document.documentElement.style.setProperty('--bg-color', e.target.value); wr('soulnotes-bg', e.target.value); });
if (rd('soulnotes-watermark') === 'false') { $('watermark').classList.add('hidden'); $('watermark-toggle').checked = false; }
$('watermark-toggle').addEventListener('change', e => { $('watermark').classList.toggle('hidden', !e.target.checked); wr('soulnotes-watermark', e.target.checked); });
$('settings-btn').addEventListener('click', e => { e.stopPropagation(); $('settings-panel').classList.toggle('open'); });
document.addEventListener('click', () => $('settings-panel').classList.remove('open'));
$('settings-panel').addEventListener('click', e => e.stopPropagation());

$('export-json').onclick = () => download('soulnote-backup.json', JSON.stringify(notes.filter(n => !n.purged), null, 2), 'application/json');
$('import-btn').onclick = () => $('import-file').click();
$('import-file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text()), list = Array.isArray(d) ? d : d.notes;
    if (!Array.isArray(list)) throw new Error('bad');
    merge(list.filter(n => n && n.id != null)); save(); render(); setStatus('Imported ' + list.length + ' notes');
  } catch { alert('Invalid backup file.'); }
};

document.addEventListener('keydown', e => {
  const open = $('modal-overlay').classList.contains('open');
  if (e.ctrlKey && e.key === 'o') { e.preventDefault(); if (!open) newNote(); return; }
  if (!open) return;
  if (e.key === 'Escape' || (e.ctrlKey && (e.key === 'Enter' || e.key === 'k'))) { e.preventDefault(); closeModal(); }
  if (e.ctrlKey && e.key === 'd') { e.preventDefault(); discard(); }
});

/* ---------- Google Drive sync (appDataFolder, free) ---------- */
function setStatus(s) { $('sync-status').textContent = s; }

function getToken() {
  return new Promise((res, rej) => {
    if (token && now() < tokenExp - 6e4) return res(token);
    if (!window.google || !google.accounts) return rej(new Error('Google script not loaded'));
    tc = tc || google.accounts.oauth2.initTokenClient({ client_id: CID, scope: SCOPE, callback: () => {} });
    tc.callback = r => {
      if (r.error) return rej(new Error(r.error));
      token = r.access_token; tokenExp = now() + r.expires_in * 1e3; wr('soulnote-sync', '1'); res(token);
    };
    tc.error_callback = e => rej(new Error(e.type || 'auth failed'));
    tc.requestAccessToken({ prompt: '' });
  });
}

async function drive(path, opt = {}, base = 'https://www.googleapis.com/drive/v3/') {
  const r = await fetch(base + path, { ...opt, headers: { Authorization: 'Bearer ' + token, ...(opt.headers || {}) } });
  if (!r.ok) throw new Error('Drive ' + r.status);
  return r;
}

async function sync() {
  if (!CID) return setStatus('Add your client ID in config.js');
  if (syncing) return;
  syncing = true;
  try {
    setStatus('Syncing...');
    await getToken();
    const q = encodeURIComponent("name='" + FILE + "'");
    const found = await (await drive('files?spaces=appDataFolder&fields=files(id)&q=' + q)).json();
    const id = found.files[0] && found.files[0].id;
    if (id) {
      const remote = await (await drive('files/' + id + '?alt=media')).json().catch(() => null);
      if (Array.isArray(remote)) merge(remote.filter(n => n && n.id != null));
    }
    wr('soulnotes', JSON.stringify(notes));
    render();
    const body = JSON.stringify(notes), up = 'https://www.googleapis.com/upload/drive/v3/';
    if (id) {
      await drive('files/' + id + '?uploadType=media', { method: 'PATCH', body, headers: { 'Content-Type': 'application/json' } }, up);
    } else {
      const b = 'soulnote_boundary', meta = JSON.stringify({ name: FILE, parents: ['appDataFolder'] });
      const mp = '--' + b + CRLF + 'Content-Type: application/json' + CRLF + CRLF + meta + CRLF + '--' + b + CRLF + 'Content-Type: application/json' + CRLF + CRLF + body + CRLF + '--' + b + '--';
      await drive('files?uploadType=multipart', { method: 'POST', body: mp, headers: { 'Content-Type': 'multipart/related; boundary=' + b } }, up);
    }
    setStatus('Synced ' + new Date().toLocaleTimeString());
  } catch (e) {
    setStatus('Sync failed: ' + e.message);
  } finally { syncing = false; }
}

function queueSync() {
  clearTimeout(syncT);
  if (token && now() < tokenExp - 6e4) syncT = setTimeout(sync, 3000);
}

$('sync-btn').onclick = sync;
$('sync-off').onclick = () => {
  if (token && window.google) google.accounts.oauth2.revoke(token);
  token = null; tokenExp = 0; wr('soulnote-sync', '0'); setStatus('Disconnected');
};
setStatus(!CID ? 'Add your client ID in config.js' : rd('soulnote-sync') === '1' ? 'Tap Sync to reconnect' : 'Not connected');

/* ---------- init ---------- */
notes.forEach(n => { if (n.trashed && !n.purged && now() - n.trashed > 30 * DAY) purge(n); });
save();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
