import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, Alert, TextInput, useFocusEffect,
} from '../components/rn-web';
import { getLists, createList, deleteList, renameList } from '../utils/lists';
import { fonts } from '../utils/theme';
import { getOwnedCards } from '../utils/storage';

export default function ListsScreen() {
  const navigate = useNavigate();
  const [lists, setLists] = useState({});
  const [owned, setOwned] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [inputName, setInputName] = useState('');

  useFocusEffect(useCallback(() => {
    getLists().then(setLists);
    getOwnedCards().then(setOwned);
  }, []));

  const openCreate = () => { setEditTarget(null); setInputName(''); setModalVisible(true); };
  const openRename = (list) => { setEditTarget(list.id); setInputName(list.name); setModalVisible(true); };

  const handleConfirm = async () => {
    const name = inputName.trim();
    if (!name) return;
    const updated = editTarget ? await renameList(editTarget, name) : await createList(name);
    setLists(updated);
    setModalVisible(false);
  };

  const handleDelete = (list) => {
    Alert.alert('Supprimer la liste', `Supprimer "${list.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { const updated = await deleteList(list.id); setLists(updated); } },
    ]);
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
                onPress={() => navigate(`/lists/${item.id}`, { state: { list: item } })}
                onLongPress={() => openRename(item)}
              >
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listMeta}>
                    {cardIds.length} carte{cardIds.length !== 1 ? 's' : ''}
                    {cardIds.length > 0 && (
                      <Text style={styles.listOwned}> · {ownedCount}/{cardIds.length}</Text>
                    )}
                  </Text>
                  {cardIds.length > 0 && (
                    <View style={styles.progressRow}>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${Math.round((ownedCount / cardIds.length) * 100)}%` }]} />
                      </View>
                      <Text style={styles.progressPct}>{Math.round((ownedCount / cardIds.length) * 100)}%</Text>
                    </View>
                  )}
                </View>
                <View style={styles.listActions}>
                  <Text style={styles.arrow}>›</Text>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 8 }}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <div
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
          onClick={() => setModalVisible(false)}
        >
          <div
            style={{ backgroundColor: '#16213e', borderRadius: 14, padding: 20, width: '85%', maxWidth: 400, border: '1px solid #2a2a4a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{editTarget ? 'Renommer la liste' : 'Nouvelle liste'}</Text>
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
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirm}>
                <Text style={styles.modalConfirmText}>{editTarget ? 'Renommer' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </div>
        </div>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  createBtn: { margin: 12, paddingTop: 12, paddingBottom: 12, borderRadius: 10, backgroundColor: '#E63F00', alignItems: 'center' },
  createBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#888', fontSize: 15, fontFamily: fonts.semibold },
  emptySub: { color: '#555', fontSize: 13, marginTop: 6 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, marginBottom: 10, padding: 14, border: '1px solid #2a2a4a' },
  listInfo: { flex: 1 },
  listName: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  listMeta: { color: '#888', fontSize: 12, marginTop: 3 },
  listOwned: { color: '#E63F00' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 2 },
  progressPct: { color: '#E63F00', fontSize: 10, fontFamily: fonts.bold, minWidth: 28, textAlign: 'right' },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { color: '#555', fontSize: 22 },
  deleteBtn: { color: '#555', fontSize: 14 },
  modalTitle: { color: '#fff', fontSize: 16, fontFamily: fonts.bold, marginBottom: 14 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15, border: '1px solid #2a2a4a', marginBottom: 16, width: '100%' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, paddingTop: 10, paddingBottom: 10, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center' },
  modalCancelText: { color: '#aaa', fontFamily: fonts.semibold },
  modalConfirm: { flex: 1, paddingTop: 10, paddingBottom: 10, borderRadius: 8, backgroundColor: '#E63F00', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontFamily: fonts.bold },
});
