// Pure calculation functions (no DOM). All amounts are integer cents.

// Net balance per friend: positive = others owe them, negative = they owe others.
// A "debt" entry (from owes to) and a "payment" entry (from paid to) move money in opposite directions.
function computeBalances(friends, entries) {
  const balances = {};
  friends.forEach(f => { balances[f.id] = 0; });
  entries.forEach(e => {
    if (!(e.from in balances) || !(e.to in balances)) return;
    const sign = e.type === 'payment' ? 1 : -1;
    balances[e.from] += sign * e.amount;
    balances[e.to] -= sign * e.amount;
  });
  return balances;
}

// Direct debts between each pair, netted (A owes B 50 and B owes A 20 -> A owes B 30).
function computePairwiseDebts(entries) {
  const net = {}; // key "a|b" with a < b; positive = a owes b
  entries.forEach(e => {
    let debtor = e.from, creditor = e.to;
    if (e.type === 'payment') [debtor, creditor] = [creditor, debtor];
    const [a, b] = debtor < creditor ? [debtor, creditor] : [creditor, debtor];
    const key = a + '|' + b;
    net[key] = (net[key] || 0) + (debtor === a ? e.amount : -e.amount);
  });
  const result = [];
  Object.entries(net).forEach(([key, amount]) => {
    if (amount === 0) return;
    const [a, b] = key.split('|');
    result.push(amount > 0 ? { from: a, to: b, amount } : { from: b, to: a, amount: -amount });
  });
  return result;
}

// Minimal-ish set of payments that settles everyone: repeatedly match the
// biggest debtor with the biggest creditor. Cycles (A->B->C->A) disappear.
function simplifyDebts(balances) {
  const debtors = [], creditors = [];
  Object.entries(balances).forEach(([id, bal]) => {
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
  module.exports = { computeBalances, computePairwiseDebts, simplifyDebts };
}
