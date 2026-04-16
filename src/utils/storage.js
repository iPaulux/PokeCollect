import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNED_KEY = 'owned_cards';

export async function getOwnedCards() {
  try {
    const json = await AsyncStorage.getItem(OWNED_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

export async function toggleCard(cardId) {
  const owned = await getOwnedCards();
  if (owned[cardId]) {
    delete owned[cardId];
  } else {
    owned[cardId] = true;
  }
  await AsyncStorage.setItem(OWNED_KEY, JSON.stringify(owned));
  return owned;
}
