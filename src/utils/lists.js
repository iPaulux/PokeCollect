import AsyncStorage from '@react-native-async-storage/async-storage';

const LISTS_KEY = 'custom_lists';

export async function getLists() {
  try {
    const raw = await AsyncStorage.getItem(LISTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveLists(lists) {
  await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

export async function createList(name) {
  const lists = await getLists();
  const id = `list_${Date.now()}`;
  lists[id] = { id, name, cards: {}, createdAt: Date.now() };
  await saveLists(lists);
  return lists;
}

export async function deleteList(listId) {
  const lists = await getLists();
  delete lists[listId];
  await saveLists(lists);
  return lists;
}

export async function renameList(listId, name) {
  const lists = await getLists();
  if (lists[listId]) lists[listId].name = name;
  await saveLists(lists);
  return lists;
}

// cardSnapshot = { id, name, number, images, set: { name } }
export async function addCardToList(listId, cardSnapshot) {
  const lists = await getLists();
  if (!lists[listId]) return lists;
  lists[listId].cards[cardSnapshot.id] = cardSnapshot;
  await saveLists(lists);
  return lists;
}

export async function removeCardFromList(listId, cardId) {
  const lists = await getLists();
  if (!lists[listId]) return lists;
  delete lists[listId].cards[cardId];
  await saveLists(lists);
  return lists;
}

export async function getListsForCard(cardId) {
  const lists = await getLists();
  return Object.values(lists).filter((l) => !!l.cards[cardId]);
}
