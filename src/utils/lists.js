import { readStore, writeStore } from './persist';

const KEY = 'custom_lists';

export async function getLists() {
  const data = await readStore(KEY);
  return data ?? {};
}

async function save(lists) {
  await writeStore(KEY, lists);
}

export async function createList(name, icon = 'poke') {
  const lists = await getLists();
  const id = `list_${Date.now()}`;
  lists[id] = { id, name, icon, cards: {}, createdAt: Date.now() };
  await save(lists);
  return lists;
}

export async function deleteList(listId) {
  const lists = await getLists();
  delete lists[listId];
  await save(lists);
  return lists;
}

export async function renameList(listId, name, icon) {
  const lists = await getLists();
  if (lists[listId]) {
    lists[listId].name = name;
    if (icon !== undefined) lists[listId].icon = icon;
  }
  await save(lists);
  return lists;
}

// cardSnapshot = { id, name, number, images, set: { name } }
export async function addCardToList(listId, cardSnapshot) {
  const lists = await getLists();
  if (!lists[listId]) return lists;
  lists[listId].cards[cardSnapshot.id] = cardSnapshot;
  await save(lists);
  return lists;
}

export async function removeCardFromList(listId, cardId) {
  const lists = await getLists();
  if (!lists[listId]) return lists;
  delete lists[listId].cards[cardId];
  await save(lists);
  return lists;
}

export async function getListsForCard(cardId) {
  const lists = await getLists();
  return Object.values(lists).filter((l) => !!l.cards[cardId]);
}
