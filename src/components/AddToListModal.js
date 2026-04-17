import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { getLists, createList, addCardToList, removeCardFromList } from '../utils/lists';
import { fonts } from '../utils/theme';

export default function AddToListModal({ visible, card, onClose }) {
  const [lists, setLists] = useState({});
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      getLists().then(setLists);
      setCreating(false);
      setNewName('');
    }
  }, [visible]);

  const isInList = (listId) => !!(lists[listId]?.cards?.[card?.id]);

  const handleToggle = async (listId) => {
    if (isInList(listId)) {
      const updated = await removeCardFromList(listId, card.id);
      setLists(updated);
    } else {
      const snapshot = {
        id: card.id,
        name: card.name,
        number: card.number,
        images: card.images,
        set: { name: card.set?.name },
      };
      const updated = await addCardToList(listId, snapshot);
      setLists(updated);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const updated = await createList(name);
    setLists(updated);
    setNewName('');
    setCreating(false);
  };

  const sorted = Object.values(lists).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Ajouter à une liste</Text>
          {card && (
            <Text style={styles.cardName} numberOfLines={1}>
              {card.name} — {card.set?.name}
            </Text>
          )}

          {sorted.length === 0 && !creating ? (
            <Text style={styles.empty}>Aucune liste — crée-en une ci-dessous</Text>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.id}
              style={styles.listScroll}
              renderItem={({ item }) => {
                const inList = isInList(item.id);
                return (
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => handleToggle(item.id)}
                  >
                    <View style={[styles.checkbox, inList && styles.checkboxChecked]}>
                      {inList && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName}>{item.name}</Text>
                      <Text style={styles.listCount}>
                        {Object.keys(item.cards || {}).length} carte(s)
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {creating ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                placeholder="Nom de la liste..."
                placeholderTextColor="#666"
                value={newName}
                onChangeText={setNewName}
                autoFocus
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity style={styles.createConfirm} onPress={handleCreate}>
                <Text style={styles.createConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setCreating(true)}
            >
              <Text style={styles.createBtnText}>+ Nouvelle liste</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#2a2a4a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 16, fontFamily: fonts.bold, marginBottom: 4 },
  cardName: { color: '#888', fontSize: 12, marginBottom: 14 },
  empty: { color: '#555', fontSize: 13, marginBottom: 14, textAlign: 'center' },
  listScroll: { maxHeight: 280 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#E63F00', borderColor: '#E63F00' },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: fonts.bold },
  listName: { color: '#fff', fontSize: 14, fontFamily: fonts.regular },
  listCount: { color: '#666', fontSize: 11 },
  createRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  createInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  createConfirm: {
    backgroundColor: '#E63F00',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  createConfirmText: { color: '#fff', fontFamily: fonts.bold },
  createBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  createBtnText: { color: '#888', fontFamily: fonts.semibold },
});
