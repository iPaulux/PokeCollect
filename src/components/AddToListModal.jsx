import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from './rn-web';
import { getLists, createList, addCardToList, removeCardFromList } from '../utils/lists';
import { fonts } from '../utils/theme';

export default function AddToListModal({ visible, card, onClose }) {
  const [lists, setLists] = useState({});
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) { getLists().then(setLists); setCreating(false); setNewName(''); }
  }, [visible]);

  if (!visible) return null;

  const isInList = (listId) => !!(lists[listId]?.cards?.[card?.id]);

  const handleToggle = async (listId) => {
    if (isInList(listId)) {
      setLists(await removeCardFromList(listId, card.id));
    } else {
      const snapshot = { id: card.id, name: card.name, number: card.number, images: card.images, set: { name: card.set?.name } };
      setLists(await addCardToList(listId, snapshot));
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setLists(await createList(name));
    setNewName('');
    setCreating(false);
  };

  const sorted = Object.values(lists).sort((a, b) => b.createdAt - a.createdAt);

  return createPortal(
    <div
      className="modal-backdrop"
      style={{ zIndex: 1100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '70vh', border: '1px solid #2a2a4a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '0 auto 16px' }} />
        <Text style={styles.title}>Ajouter à une liste</Text>
        {card && <Text style={styles.cardName} numberOfLines={1}>{card.name} — {card.set?.name}</Text>}

        {sorted.length === 0 && !creating ? (
          <Text style={styles.empty}>Aucune liste — crée-en une ci-dessous</Text>
        ) : (
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            {sorted.map((item) => {
              const inList = isInList(item.id);
              return (
                <TouchableOpacity key={item.id} style={styles.listRow} onPress={() => handleToggle(item.id)}>
                  <View style={[styles.checkbox, inList && styles.checkboxChecked]}>
                    {inList && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{item.name}</Text>
                    <Text style={styles.listCount}>{Object.keys(item.cards || {}).length} carte(s)</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </div>
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
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreating(true)}>
            <Text style={styles.createBtnText}>+ Nouvelle liste</Text>
          </TouchableOpacity>
        )}
      </div>
    </div>,
    document.body
  );
}

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 16, fontFamily: fonts.bold, marginBottom: 4 },
  cardName: { color: '#888', fontSize: 12, marginBottom: 14 },
  empty: { color: '#555', fontSize: 13, marginBottom: 14, textAlign: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid #2a2a4a', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '2px solid #444', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#E63F00', border: '2px solid #E63F00' },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: fonts.bold },
  listName: { color: '#fff', fontSize: 14, fontFamily: fonts.regular },
  listCount: { color: '#666', fontSize: 11 },
  createRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  createInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, border: '1px solid #2a2a4a' },
  createConfirm: { backgroundColor: '#E63F00', borderRadius: 8, padding: '9px 16px' },
  createConfirmText: { color: '#fff', fontFamily: fonts.bold },
  createBtn: { marginTop: 14, paddingTop: 11, paddingBottom: 11, borderRadius: 10, backgroundColor: '#1a1a2e', alignItems: 'center', border: '1px solid #2a2a4a' },
  createBtnText: { color: '#888', fontFamily: fonts.semibold },
});
