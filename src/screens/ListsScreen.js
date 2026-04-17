import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLists, createList, deleteList, renameList } from '../utils/lists';
import { fonts } from '../utils/theme';
import { getOwnedCards } from '../utils/storage';

export default function ListsScreen({ navigation }) {
  const [lists, setLists] = useState({});
  const [owned, setOwned] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create, id = rename
  const [inputName, setInputName] = useState('');

  useFocusEffect(
    useCallback(() => {
      getLists().then(setLists);
      getOwnedCards().then(setOwned);
    }, [])
  );

  const openCreate = () => {
    setEditTarget(null);
    setInputName('');
    setModalVisible(true);
  };

  const openRename = (list) => {
    setEditTarget(list.id);
    setInputName(list.name);
    setModalVisible(true);
  };

  const handleConfirm = async () => {
    const name = inputName.trim();
    if (!name) return;
    if (editTarget) {
      const updated = await renameList(editTarget, name);
      setLists(updated);
    } else {
      const updated = await createList(name);
      setLists(updated);
    }
    setModalVisible(false);
  };

  const handleDelete = (list) => {
    Alert.alert(
      'Supprimer la liste',
      `Supprimer "${list.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteList(list.id);
            setLists(updated);
          },
        },
      ]
    );
  };

  const sorted = Object.values(lists).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
        <Text style={styles.createBtnText}>+ Nouvelle liste</Text>
      </TouchableOpacity>

      {sorted.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune liste pour l'instant</Text>
          <Text style={styles.emptySub}>Crée une liste pour organiser tes cartes</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const cardIds = Object.keys(item.cards || {});
            const ownedCount = cardIds.filter((id) => owned[id]).length;
            return (
              <TouchableOpacity
                style={styles.listCard}
                onPress={() => navigation.navigate('ListDetail', { list: item })}
                onLongPress={() => openRename(item)}
              >
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listMeta}>
                    {cardIds.length} carte{cardIds.length !== 1 ? 's' : ''}
                    {cardIds.length > 0 && (
                      <Text style={styles.listOwned}>
                        {' '}· {ownedCount}/{cardIds.length} possédées
                      </Text>
                    )}
                  </Text>
                </View>
                <View style={styles.listActions}>
                  <Text style={styles.arrow}>›</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Renommer la liste' : 'Nouvelle liste'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de la liste..."
              placeholderTextColor="#666"
              value={inputName}
              onChangeText={setInputName}
              autoFocus
              onSubmitEditing={handleConfirm}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirm}>
                <Text style={styles.modalConfirmText}>
                  {editTarget ? 'Renommer' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  createBtn: {
    margin: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E63F00',
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#888', fontSize: 15, fontFamily: fonts.semibold },
  emptySub: { color: '#555', fontSize: 13, marginTop: 6 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  listInfo: { flex: 1 },
  listName: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  listMeta: { color: '#888', fontSize: 12, marginTop: 3 },
  listOwned: { color: '#E63F00' },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { color: '#555', fontSize: 22 },
  deleteBtn: { color: '#555', fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontFamily: fonts.bold, marginBottom: 14 },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
  },
  modalCancelText: { color: '#aaa', fontFamily: fonts.semibold },
  modalConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E63F00',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontFamily: fonts.bold },
});
