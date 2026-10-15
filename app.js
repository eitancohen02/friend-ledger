// UI and storage. Calculations live in logic.js, avatar pictures in avatars.js.

const STORAGE_KEY = 'friend-ledger';

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.friends) && Array.isArray(saved.entries)) return saved;
  } catch (e) { /* ignore broken data */ }
  return { friends: [], entries: [] };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert('Could not save to browser storage (it may be full). Changes will be lost on refresh.');
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function friendById(id) {
  return state.friends.find(f => f.id === id);
}

function nameOf(id) {
  const friend = friendById(id);
  return friend ? friend.name : '(removed)';
}

function formatMoney(cents) {
  return (cents / 100).toFixed(2);
}

function activeEntries() {
  return state.entries.filter(e => !e.archived);
}

// ---------- Avatars ----------

const INITIAL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

// Picture for a friend; falls back to a colored circle with their first letter.
function avatarElement(friend, size = '') {
  const url = friend ? avatarUrl(friend.avatar) : '';
  let el;
  if (url) {
    el = document.createElement('img');
    el.src = url;
    el.alt = friend.name;
  } else {
    el = document.createElement('span');
    const name = friend ? friend.name : '?';
    el.textContent = name.charAt(0).toUpperCase();
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    el.style.background = INITIAL_COLORS[hash % INITIAL_COLORS.length];
    el.classList.add('initial');
  }
  el.classList.add('avatar');
  if (size) el.classList.add(size);
  return el;
}

// A row of selectable pictures plus an "upload your own" tile.
function createAvatarPicker(container) {
  let value = '';
  let customImage = ''; // last uploaded picture, kept so it stays selectable

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      customImage = await resizeImageFile(file);
      value = customImage;
      draw();
    } catch (err) {
      alert(err.message);
    }
  });

  function option(url, optionValue, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option' + (value === optionValue ? ' selected' : '');
    btn.title = title;
    const img = document.createElement('img');
    img.src = url;
    img.alt = title;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      value = value === optionValue ? '' : optionValue; // click again to unselect
      draw();
    });
    return btn;
  }

  function draw() {
    container.innerHTML = '';
    Object.entries(PRESET_AVATARS).forEach(([key, preset]) => {
      container.appendChild(option(presetAvatarUrl(key), 'preset:' + key, preset.label));
    });
    if (customImage) container.appendChild(option(customImage, customImage, 'Your picture'));

    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'avatar-option upload';
    upload.textContent = '+ Upload';
    upload.title = 'Upload your own picture';
    upload.addEventListener('click', () => fileInput.click());
    container.appendChild(upload);
    container.appendChild(fileInput);
  }

  draw();
  return {
    getValue: () => value,
    setValue(newValue) {
      value = newValue || '';
      customImage = value.startsWith('data:') ? value : '';
      draw();
    },
  };
}

const newFriendPicker = createAvatarPicker(document.getElementById('new-friend-picker'));
const editFriendPicker = createAvatarPicker(document.getElementById('edit-friend-picker'));

// Suggest a hero nobody is using yet.
function suggestAvatar() {
  const used = new Set(state.friends.map(f => f.avatar));
  const free = Object.keys(PRESET_AVATARS).find(key => !used.has('preset:' + key));
  newFriendPicker.setValue(free ? 'preset:' + free : '');
}

// ---------- Rendering ----------

function li(className) {
  const item = document.createElement('li');
  if (className) item.className = className;
  return item;
}

function emptyItem(text) {
  const item = li('empty');
  item.textContent = text;
  return item;
}

function span(text, className) {
  const el = document.createElement('span');
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function smallButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'small';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// "[pic] Alice → [pic] Bob"
function whoElement(fromId, toId, arrowText = '→') {
  const who = span('', 'who');
  who.append(
    avatarElement(friendById(fromId), 'tiny'), span(nameOf(fromId)),
    span(arrowText, 'arrow'),
    avatarElement(friendById(toId), 'tiny'), span(nameOf(toId)),
  );
  return who;
}

function render() {
  const entries = activeEntries();
  const balances = computeBalances(state.friends, entries);

  renderFriends(balances);
  renderSelects();
  renderBalances(balances);
  renderDebtList(document.getElementById('pairwise-list'), computePairwiseDebts(entries), false);
  renderDebtList(document.getElementById('simplified-list'), simplifyDebts(balances), true);
  renderHistory();
}

function renderFriends(balances) {
  const list = document.getElementById('friend-list');
  list.innerHTML = '';
  if (state.friends.length === 0) {
    list.appendChild(emptyItem('No friends yet. Add some above.'));
    return;
  }
  state.friends.forEach(friend => {
    const card = li('friend-card');
    const avatarButton = document.createElement('button');
    avatarButton.type = 'button';
    avatarButton.className = 'avatar-button';
    avatarButton.title = 'Change picture';
    avatarButton.appendChild(avatarElement(friend, 'large'));
    avatarButton.addEventListener('click', () => openAvatarDialog(friend.id));
    card.append(avatarButton, span(friend.name, 'name'), smallButton('Remove', () => removeFriend(friend.id, balances)));
    list.appendChild(card);
  });
}

function renderSelects() {
  ['entry-from', 'entry-to'].forEach((selectId, index) => {
    const select = document.getElementById(selectId);
    const previous = select.value;
    select.innerHTML = '';
    state.friends.forEach(friend => {
      const option = document.createElement('option');
      option.value = friend.id;
      option.textContent = friend.name;
      select.appendChild(option);
    });
    if (state.friends.some(f => f.id === previous)) {
      select.value = previous;
    } else if (state.friends[index]) {
      select.value = state.friends[index].id; // default to two different people
    }
  });
}

function renderBalances(balances) {
  const list = document.getElementById('balance-list');
  list.innerHTML = '';
  if (state.friends.length === 0) {
    list.appendChild(emptyItem('Nothing to show.'));
    return;
  }
  state.friends.forEach(friend => {
    const bal = balances[friend.id];
    const item = li();
    const who = span('', 'who');
    who.append(avatarElement(friend), span(friend.name));
    let pill;
    if (bal > 0) pill = span('is owed ' + formatMoney(bal), 'amount-pill positive');
    else if (bal < 0) pill = span('owes ' + formatMoney(-bal), 'amount-pill negative');
    else pill = span('settled', 'amount-pill settled');
    item.append(who, pill);
    list.appendChild(item);
  });
}

function renderDebtList(list, debts, withSettle) {
  list.innerHTML = '';
  if (debts.length === 0) {
    list.appendChild(emptyItem('Everyone is settled up.'));
    return;
  }
  debts.forEach(d => {
    const item = li();
    item.append(whoElement(d.from, d.to), span(formatMoney(d.amount), 'amount-pill negative'));
    if (withSettle) {
      item.appendChild(smallButton('Mark paid', () => {
        addEntry({ type: 'payment', from: d.from, to: d.to, amount: d.amount, note: 'Settled up' });
      }));
    }
    list.appendChild(item);
  });
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  if (state.entries.length === 0) {
    list.appendChild(emptyItem('No transactions yet.'));
    return;
  }
  [...state.entries].reverse().forEach(e => {
    const item = li(e.archived ? 'archived' : '');
    const text = span('', 'text');
    const verb = e.type === 'payment' ? 'paid' : 'owes';
    text.append(whoElement(e.from, e.to, verb));
    const details = span(formatMoney(e.amount) + (e.note ? ` — ${e.note}` : ''));
    details.style.marginLeft = '34px';
    text.append(details);
    item.append(text, span(new Date(e.date).toLocaleDateString(), 'muted'));
    if (!e.archived) item.appendChild(smallButton('Delete', () => deleteEntry(e.id)));
    list.appendChild(item);
  });
}

// ---------- Actions ----------

function addFriend(name, avatar) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (state.friends.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A friend with that name already exists.');
    return false;
  }
  state.friends.push({ id: newId(), name: trimmed, avatar });
  saveState();
  render();
  return true;
}

function removeFriend(id, balances) {
  if (balances[id] !== 0) {
    alert(`${nameOf(id)} still has an open balance. Settle up before removing them.`);
    return;
  }
  if (!confirm(`Remove ${nameOf(id)}?`)) return;
  state.friends = state.friends.filter(f => f.id !== id);
  saveState();
  render();
}

function addEntry({ type, from, to, amount, note }) {
  state.entries.push({ id: newId(), type, from, to, amount, note: note || '', date: Date.now() });
  saveState();
  render();
}

function deleteEntry(id) {
  if (!confirm('Delete this transaction?')) return;
  state.entries = state.entries.filter(e => e.id !== id);
  saveState();
  render();
}

// Replace all open transactions with the simplified set. Old ones stay in history, crossed out.
function applySimplification() {
  if (activeEntries().length === 0) return;
  const simplified = simplifyDebts(computeBalances(state.friends, activeEntries()));
  if (!confirm('Replace all current debts with the simplified version?')) return;
  state.entries.forEach(e => { e.archived = true; });
  simplified.forEach(d => {
    state.entries.push({
      id: newId(), type: 'debt', from: d.from, to: d.to, amount: d.amount,
      note: 'Simplified', date: Date.now(),
    });
  });
  saveState();
  render();
}

// ---------- Change picture dialog ----------

const avatarDialog = document.getElementById('avatar-dialog');
let editingFriendId = null;

function openAvatarDialog(id) {
  editingFriendId = id;
  document.getElementById('avatar-dialog-title').textContent = `Change ${nameOf(id)}'s picture`;
  editFriendPicker.setValue(friendById(id).avatar);
  avatarDialog.showModal();
}

document.getElementById('avatar-cancel').addEventListener('click', () => avatarDialog.close());

document.getElementById('avatar-save').addEventListener('click', () => {
  const friend = friendById(editingFriendId);
  if (friend) {
    friend.avatar = editFriendPicker.getValue();
    saveState();
    render();
  }
  avatarDialog.close();
});

// ---------- Event wiring ----------

document.getElementById('friend-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('friend-name');
  if (addFriend(input.value, newFriendPicker.getValue())) {
    input.value = '';
    suggestAvatar();
  }
  input.focus();
});

document.getElementById('entry-form').addEventListener('submit', event => {
  event.preventDefault();
  const error = document.getElementById('entry-error');
  const from = document.getElementById('entry-from').value;
  const to = document.getElementById('entry-to').value;
  const amount = Math.round(parseFloat(document.getElementById('entry-amount').value) * 100);

  if (state.friends.length < 2) { error.textContent = 'Add at least two friends first.'; return; }
  if (from === to) { error.textContent = 'Pick two different friends.'; return; }
  if (!(amount > 0)) { error.textContent = 'Enter an amount greater than 0.'; return; }
  error.textContent = '';

  addEntry({
    type: document.getElementById('entry-type').value,
    from, to, amount,
    note: document.getElementById('entry-note').value.trim(),
  });
  document.getElementById('entry-amount').value = '';
  document.getElementById('entry-note').value = '';
});

document.getElementById('apply-simplify').addEventListener('click', applySimplification);

document.getElementById('reset-all').addEventListener('click', () => {
  if (!confirm('Delete all friends and transactions?')) return;
  state = { friends: [], entries: [] };
  saveState();
  suggestAvatar();
  render();
});

suggestAvatar();
render();
