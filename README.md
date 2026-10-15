# Friend Ledger

Track who owes whom among a group of friends, and settle up with as few payments as possible.

**Live site:** https://eitancohen02.github.io/friend-ledger/

Friend Ledger runs entirely in your browser. There is no server or account, and your data never leaves your device.

## Features

- **Friends with profile pictures**: pick one of eight built-in superhero avatars, upload your own photo, or use a colored initial.
- **Three kinds of transaction**
  - *A owes B*: a simple debt.
  - *A paid B*: a payment that pays a debt back.
  - *A paid a shared bill*: one person pays and the cost is split among the people you tick, **equally**, **by exact amounts**, **by percentages** or **by shares** (e.g. 2 shares pays twice as much as 1). A live preview shows each person's share and tells you if the split doesn't add up.
- **Balances**: who is owed money, who owes, and who is settled.
- **Who owes whom**: the direct debts between each pair, next to a **simplified** plan that settles everyone with the fewest possible payments. "Mark paid" records a payment, and "Apply simplification" replaces the open debts with the simplified ones.
- **History** of every transaction. Simplified-away entries stay visible, crossed out.

## Running it

There is nothing to install or build. Either visit the live site, or clone the repo and open `index.html` directly in a browser:

```bash
git clone https://github.com/eitancohen02/friend-ledger.git
cd friend-ledger
# then open index.html in your browser
```

The only network request is for the Google Fonts (Bangers and Inter). Offline, the app still works with fallback fonts.

## Data and privacy

Everything is saved in your browser's `localStorage` under the key `friend-ledger`. This means:

- Data is per browser and per device. It isn't shared with friends or synced between devices.
- Clearing site data, or using a private window, starts you with an empty ledger.
- Uploaded pictures are resized to 160×160 and stored with the rest of the data, so very many uploads can fill the browser's storage limit (about 5 MB).

## How the math works

All amounts are stored as **whole cents** to avoid floating-point rounding errors.

### Splitting a bill

Equal, percentage and share splits divide the total in proportion to each person's weight. Each person first gets their share rounded down to the cent, and the leftover cents go one at a time to whoever had the biggest fraction cut off (ties go to whoever is listed first). The shares always add up exactly to the total, and the same split always gives the same result. For example, 100.00 split three ways is 33.34 / 33.33 / 33.33.

### Settling with the fewest payments

A group of *k* people whose balances add up to zero can always settle among themselves in *k − 1* payments. So the minimum number of payments is:

> (people with a non-zero balance) − (the largest number of zero-sum groups they can be split into)

Finding that split is NP-hard in general. For up to 16 people with open balances, the app finds it exactly with a dynamic-programming search over all subsets (O(2ⁿ · n), a few milliseconds at n = 16), then settles each group by repeatedly matching its biggest debtor with its biggest creditor. Above 16 people it falls back to that greedy matching for everyone, which is usually close to optimal, and the page tells you the result is an estimate.

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page layout |
| `style.css` | Styling (dark, comic-book theme) |
| `logic.js` | Calculations with no page code: balances, pairwise debts, bill splitting, settlement. Also exports itself for Node, so it can be unit-tested. |
| `avatars.js` | Built-in hero avatars drawn as inline SVG, and photo resizing for uploads |
| `app.js` | Interface, rendering, event handling and `localStorage` saving |

## Deployment

The site is served by GitHub Pages straight from the root of the `main` branch. Every push to `main` is live within a minute or two. Browsers may keep the old version for up to 10 minutes, so hard-refresh (Ctrl+F5) if you don't see a change.
