// Pure calculation functions (no DOM). All amounts are integer cents.

// Entry types:
//   debt    - from owes to `amount`
//   payment - from paid to `amount`
//   expense - from paid a shared bill of `amount`, split as `shares` [{ id, amount }]
//             (the payer may have a share too; their own share doesn't create a debt)

// The debts an entry creates, as [{ debtor, creditor, amount }].
function entryDebts(e) {
  if (e.type === 'payment') return [{ debtor: e.to, creditor: e.from, amount: e.amount }];
  if (e.type === 'expense') {
    return e.shares
      .filter(s => s.id !== e.from && s.amount > 0)
      .map(s => ({ debtor: s.id, creditor: e.from, amount: s.amount }));
  }
  return [{ debtor: e.from, creditor: e.to, amount: e.amount }];
}

// Net balance per friend: positive = others owe them, negative = they owe others.
// Entries involving a removed friend are ignored.
function computeBalances(friends, entries) {
  const balances = {};
  friends.forEach(f => { balances[f.id] = 0; });
  entries.forEach(e => {
    const debts = entryDebts(e);
    if (debts.some(d => !(d.debtor in balances) || !(d.creditor in balances))) return;
    debts.forEach(d => {
      balances[d.debtor] -= d.amount;
      balances[d.creditor] += d.amount;
    });
  });
  return balances;
}

// Direct debts between each pair, netted (A owes B 50 and B owes A 20 -> A owes B 30).
function computePairwiseDebts(entries) {
  const net = {}; // key "a|b" with a < b; positive = a owes b
  entries.forEach(e => {
    entryDebts(e).forEach(({ debtor, creditor, amount }) => {
      const [a, b] = debtor < creditor ? [debtor, creditor] : [creditor, debtor];
      const key = a + '|' + b;
      net[key] = (net[key] || 0) + (debtor === a ? amount : -amount);
    });
  });
  const result = [];
  Object.entries(net).forEach(([key, amount]) => {
    if (amount === 0) return;
    const [a, b] = key.split('|');
    result.push(amount > 0 ? { from: a, to: b, amount } : { from: b, to: a, amount: -amount });
  });
  return result;
}

// Divide `total` cents in proportion to `weights` so the parts add up exactly.
// Each part gets its rounded-down amount, then the leftover cents go one each to the
// biggest fractions (ties go to whoever is listed first, so the result is deterministic).
function allocateByWeight(total, weights) {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const parts = weights.map((w, index) => {
    const exact = total * w / weightSum;
    const floor = Math.floor(exact + 1e-9);
    return { index, floor, fraction: exact - floor };
  });
  let leftover = total - parts.reduce((sum, p) => sum + p.floor, 0);
  [...parts]
    .sort((x, y) => y.fraction - x.fraction || x.index - y.index)
    .forEach(p => { if (leftover > 0) { p.floor += 1; leftover -= 1; } });
  return parts.map(p => p.floor);
}

// Split `total` cents between people. `values` is [{ id, value }] for everyone included:
//   equal   - value ignored
//   exact   - value is that person's amount in cents; must add up to total
//   percent - value is a percentage; must add up to 100
//   shares  - value is a weight (e.g. 2 shares pays twice as much as 1)
// Returns [{ id, amount }]. Throws an Error with a readable message if the split is invalid.
function splitAmount(total, mode, values) {
  if (values.length === 0) throw new Error('Pick at least one person to split with.');
  if (!(total > 0)) throw new Error('Enter the total amount.');

  if (mode === 'exact') {
    if (values.some(v => !Number.isInteger(v.value) || v.value < 0)) {
      throw new Error('Enter an amount for everyone included.');
    }
    const sum = values.reduce((s, v) => s + v.value, 0);
    if (sum !== total) {
      const diff = total - sum;
      throw new Error(diff > 0
        ? `${(diff / 100).toFixed(2)} still to assign.`
        : `Amounts are ${(-diff / 100).toFixed(2)} over the total.`);
    }
    return values.map(v => ({ id: v.id, amount: v.value }));
  }

  let weights;
  if (mode === 'equal') {
    weights = values.map(() => 1);
  } else if (mode === 'percent' || mode === 'shares') {
    weights = values.map(v => v.value);
    if (weights.some(w => !Number.isFinite(w) || w < 0)) {
      throw new Error(mode === 'percent'
        ? 'Enter a percentage for everyone included.'
        : 'Enter a number of shares for everyone included.');
    }
    const sum = weights.reduce((s, w) => s + w, 0);
    if (mode === 'percent' && Math.abs(sum - 100) > 1e-6) {
      throw new Error(`Percentages add up to ${+sum.toFixed(2)}%, not 100%.`);
    }
    if (sum <= 0) throw new Error('At least one person needs a share.');
  } else {
    throw new Error('Unknown split method.');
  }

  const amounts = allocateByWeight(total, weights);
  return values.map((v, i) => ({ id: v.id, amount: amounts[i] }));
}

// Up to this many people with open balances, simplifyDebts finds the true minimum.
// The search is O(2^n * n), so beyond this it falls back to the greedy method.
const EXACT_SETTLE_LIMIT = 16;

// Fewest payments that settle everyone.
// A group of k people whose balances sum to zero can always settle in k - 1 payments,
// so the minimum is (people with a balance) - (most zero-sum groups they can be split into).
// We find that split exactly with a search over subsets, then settle each group greedily.
// Returns { payments: [{ from, to, amount }], optimal: bool }.
function simplifyDebts(balances) {
  const people = Object.entries(balances).filter(([, bal]) => bal !== 0);
  if (people.length > EXACT_SETTLE_LIMIT) return { payments: greedySettle(people), optimal: false };

  const n = people.length;
  const full = (1 << n) - 1;
  const sum = new Array(full + 1).fill(0); // sum[mask] = total balance of the people in mask
  const groups = new Array(full + 1).fill(0); // most zero-sum groups that mask can be cut into
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask;
    sum[mask] = sum[mask ^ low] + people[31 - Math.clz32(low)][1];
    let best = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) best = Math.max(best, groups[mask ^ (1 << i)]);
    }
    groups[mask] = best + (sum[mask] === 0 ? 1 : 0);
  }

  // Walk back down from everyone, removing one person at a time along a best path.
  // Every time the remaining set sums to zero again, the people removed since form one group.
  const payments = [];
  let mask = full, group = [];
  while (mask) {
    const target = groups[mask] - (sum[mask] === 0 ? 1 : 0);
    let i = 0;
    while (!(mask & (1 << i)) || groups[mask ^ (1 << i)] !== target) i++;
    mask ^= 1 << i;
    group.push(people[i]);
    if (sum[mask] === 0) {
      payments.push(...greedySettle(group));
      group = [];
    }
  }
  return { payments, optimal: true };
}

// Repeatedly match the biggest debtor with the biggest creditor.
// Every payment zeroes at least one person, so a zero-sum group of k settles in at most k - 1.
// `people` is [[id, balance], ...].
function greedySettle(people) {
  const debtors = [], creditors = [];
  people.forEach(([id, bal]) => {
    if (bal < 0) debtors.push({ id, amount: -bal });
    else if (bal > 0) creditors.push({ id, amount: bal });
  });
  const result = [];
  while (debtors.length && creditors.length) {
    debtors.sort((x, y) => y.amount - x.amount);
    creditors.sort((x, y) => y.amount - x.amount);
    const d = debtors[0], c = creditors[0];
    const amount = Math.min(d.amount, c.amount);
    result.push({ from: d.id, to: c.id, amount });
    d.amount -= amount;
    c.amount -= amount;
    if (d.amount === 0) debtors.shift();
    if (c.amount === 0) creditors.shift();
  }
  return result;
}

if (typeof module !== 'undefined') {
  module.exports = {
    entryDebts, computeBalances, computePairwiseDebts, allocateByWeight, splitAmount,
    simplifyDebts, greedySettle, EXACT_SETTLE_LIMIT,
  };
}
