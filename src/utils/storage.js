import { readStore, writeStore } from './persist';

const KEY = 'owned_cards';

export async function getOwnedCards() {
  const data = await readStore(KEY);
  return data ?? {};
}

export async function toggleCard(cardId) {
  const owned = await getOwnedCards();
  if (owned[cardId]) {
    delete owned[cardId];
  } else {
    owned[cardId] = true;
  }
  await writeStore(KEY, owned);
  return owned;
}
