import { readStore, writeStore } from './persist';

const KEY = 'owned_cards';
const FAV_CARDS_KEY = 'favorite_cards';
const FAV_SETS_KEY = 'favorite_sets';

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

// ─── Favoris cartes ──────────────────────────────────────────────────────────
// Stocke { cardId: { id, name, number, images, set } } pour affichage offline

export async function getFavoriteCards() {
  const data = await readStore(FAV_CARDS_KEY);
  return data ?? {};
}

export async function toggleFavoriteCard(card) {
  const favs = await getFavoriteCards();
  if (favs[card.id]) {
    delete favs[card.id];
  } else {
    favs[card.id] = {
      id: card.id,
      name: card.name,
      number: card.number,
      images: card.images,
      set: card.set ? { id: card.set.id, name: card.set.name } : undefined,
    };
  }
  await writeStore(FAV_CARDS_KEY, favs);
  return favs;
}

// ─── Favoris sets ────────────────────────────────────────────────────────────
// Stocke { setId: { id, name, series, total, images, releaseDate } }

export async function getFavoriteSets() {
  const data = await readStore(FAV_SETS_KEY);
  return data ?? {};
}

export async function toggleFavoriteSet(set) {
  const favs = await getFavoriteSets();
  if (favs[set.id]) {
    delete favs[set.id];
  } else {
    favs[set.id] = {
      id: set.id,
      name: set.name,
      series: set.series,
      total: set.total,
      images: set.images,
      releaseDate: set.releaseDate,
    };
  }
  await writeStore(FAV_SETS_KEY, favs);
  return favs;
}
