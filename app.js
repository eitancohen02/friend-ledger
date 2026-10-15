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

// ---------- Shared bill split ----------

const SPLIT_LABELS = {
  equal: 'split equally',
  exact: 'split by exact amounts',
  percent: 'split by percentage',
  shares: 'split by shares',
};
const SPLIT_INPUTS = {
  exact: { step: '0.01', placeholder: '0.00', suffix: '' },
  percent: { step: 'any', placeholder: '0', suffix: '%' },
  shares: { step: 'any', placeholder: '1', suffix: 'sh' },
};

// What's been typed for each friend, kept across re-renders. Each split method keeps its own values.
const splitInputs = {};

function splitRow(id) {
  if (!splitInputs[id]) splitInputs[id] = { included: true, values: { exact: '', percent: '', shares: '1' } };
  return splitInputs[id];
}

function isSharedBill() {
  return document.getElementById('entry-type').value === 'expense';
}

// The split as splitAmount() expects it: amounts in cents for "exact", plain numbers otherwise.
// A blank box counts as 0, so the status can say how much is still left to assign.
function readSplit() {
  const mode = document.getElementById('split-mode').value;
  const values = state.friends
    .filter(f => splitRow(f.id).included)
    .map(f => {
      const raw = (splitRow(f.id).values[mode] || '').trim(); // "equal" has no typed values
      const num = raw === '' ? 0 : parseFloat(raw);
      return { id: f.id, value: mode === 'exact' ? Math.round(num * 100) : num };
    });
  return { mode, values };
}

function readAmount() {
  return Math.round(parseFloat(document.getElementById('entry-amount').value) * 100);
}

function updateEntryType() {
  const shared = isSharedBill();
  document.getElementById('entry-to').hidden = shared;
  document.getElementById('split-panel').hidden = !shared;
  if (shared) renderSplitList();
}

function renderSplitList() {
  const list = document.getElementById('split-list');
  const mode = document.getElementById('split-mode').value;
  const payer = document.getElementById('entry-from').value;
  list.innerHTML = '';
  state.friends.forEach(friend => {
    const row = splitRow(friend.id);
    const item = li(row.included ? '' : 'excluded');

    const label = document.createElement('label');
    label.className = 'who';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = row.included;
    checkbox.addEventListener('change', () => {
      row.included = checkbox.checked;
      renderSplitList();
    });
    label.append(checkbox, avatarElement(friend, 'tiny'), span(friend.name));
    if (friend.id === payer) label.append(span('paid', 'tag'));
    item.appendChild(label);

    if (mode !== 'equal') {
      const config = SPLIT_INPUTS[mode];
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = config.step;
      input.placeholder = config.placeholder;
      input.value = row.values[mode];
      input.disabled = !row.included;
      input.setAttribute('aria-label', `${friend.name}: ${SPLIT_LABELS[mode]}`);
      input.addEventListener('input', () => {
        row.values[mode] = input.value;
        updateSplitPreview();
      });
      item.append(input, span(config.suffix, 'suffix'));
    }

    const share = span('', 'amount-pill settled share');
    share.dataset.id = friend.id;
    item.appendChild(share);
    list.appendChild(item);
  });
  updateSplitPreview();
}

// Show each person's share, or what's wrong with the split, without rebuilding the list (keeps focus).
function updateSplitPreview() {
  const status = document.getElementById('split-status');
  const total = readAmount();
  const { mode, values } = readSplit();
  let shares = [];
  try {
    shares = splitAmount(total, mode, values);
    status.textContent = `Everyone's shares add up to ${formatMoney(total)}.`;
    status.className = 'split-status ok';
  } catch (err) {
    status.textContent = err.message;
    status.className = 'split-status problem';
  }
  const byId = {};
  shares.forEach(s => { byId[s.id] = s.amount; });
  document.querySelectorAll('#split-list .share').forEach(pill => {
    const amount = byId[pill.dataset.id];
    pill.textContent = amount === undefined ? '–' : formatMoney(amount);
  });
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
  const pairwise = computePairwiseDebts(entries);
  const settlement = simplifyDebts(balances);

  renderFriends(balances);
  renderSelects();
  if (isSharedBill()) renderSplitList();
  renderBalances(balances);
  renderDebtList(document.getElementById('pairwise-list'), pairwise, false);
  renderDebtList(document.getElementById('simplified-list'), settlement.payments, true);
  renderSettlementSummary(settlement, pairwise.length);
  renderHistory();
}

function renderSettlementSummary({ payments, optimal }, directCount) {
  const summary = document.getElementById('simplified-summary');
  const n = payments.length;
  if (n === 0) {
    summary.textContent = '';
    return;
  }
  const count = `${n} payment${n === 1 ? '' : 's'}`;
  if (!optimal) {
    summary.textContent = `${count} settles everyone. (Too many people to guarantee the minimum, so this is a close estimate.)`;
    return;
  }
  summary.textContent = `${count} settles everyone, the fewest possible.`
    + (directCount > n ? ` Paying back each debt directly would take ${directCount}.` : '');
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
    if (e.type === 'expense') {
      const who = span('', 'who');
      who.append(avatarElement(friendById(e.from), 'tiny'), span(nameOf(e.from)), span('paid a shared bill', 'arrow'));
      text.append(who);
    } else {
      text.append(whoElement(e.from, e.to, e.type === 'payment' ? 'paid' : 'owes'));
    }
    const details = span(formatMoney(e.amount) + (e.note ? ` — ${e.note}` : ''), 'details');
    text.append(details);
    if (e.type === 'expense') {
      const breakdown = e.shares.map(s => `${nameOf(s.id)} ${formatMoney(s.amount)}`).join(' · ');
      text.append(span(`${SPLIT_LABELS[e.splitMode] || 'split'}: ${breakdown}`, 'details muted'));
    }
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

function addEntry(fields) {
  state.entries.push({ id: newId(), ...fields, note: fields.note || '', date: Date.now() });
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
  const simplified = simplifyDebts(computeBalances(state.friends, activeEntries())).payments;
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
  const amount = readAmount();
  const type = document.getElementById('entry-type').value;
  const note = document.getElementById('entry-note').value.trim();

  if (state.friends.length < 2) { error.textContent = 'Add at least two friends first.'; return; }
  if (!(amount > 0)) { error.textContent = 'Enter an amount greater than 0.'; return; }

  if (type === 'expense') {
    const { mode, values } = readSplit();
    let shares;
    try {
      shares = splitAmount(amount, mode, values).filter(s => s.amount > 0);
    } catch (err) {
      error.textContent = err.message;
      return;
    }
    if (!shares.some(s => s.id !== from)) {
      error.textContent = 'Include at least one person besides the payer.';
      return;
    }
    error.textContent = '';
    addEntry({ type, from, amount, shares, splitMode: mode, note });
    Object.values(splitInputs).forEach(row => { row.values.exact = ''; }); // exact amounts belong to one bill
  } else {
    if (from === to) { error.textContent = 'Pick two different friends.'; return; }
    error.textContent = '';
    addEntry({ type, from, to, amount, note });
  }
  document.getElementById('entry-amount').value = '';
  document.getElementById('entry-note').value = '';
  if (isSharedBill()) renderSplitList();
});

document.getElementById('entry-type').addEventListener('change', updateEntryType);
document.getElementById('split-mode').addEventListener('change', renderSplitList);
document.getElementById('entry-from').addEventListener('change', () => { if (isSharedBill()) renderSplitList(); });
document.getElementById('entry-amount').addEventListener('input', () => { if (isSharedBill()) updateSplitPreview(); });

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
