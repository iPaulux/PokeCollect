import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, useFocusEffect,
} from '../components/rn-web';
import { getLists, createList, deleteList, renameList } from '../utils/lists';
import { fonts } from '../utils/theme';
import { getOwnedCards } from '../utils/storage';
import PokeBallPicker, { PokeBallSVG, POKEBALLS } from '../components/PokeBallPicker';
import { ChevronRight, Trash2 } from 'lucide-react';

// ─── Icône Pokédex ────────────────────────────────────────────────────────────
function PokedexIcon({ size = 40 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Corps */}
      <rect x="4" y="4" width="32" height="32" rx="6" fill="#cc2200" />
      {/* Bande centrale */}
      <rect x="4" y="17" width="32" height="6" fill="#111" />
      {/* Partie basse */}
      <rect x="4" y="23" width="32" height="13" rx="0" fill="#eee" />
      <rect x="4" y="30" width="32" height="6" rx="6" fill="#eee" />
      {/* Bouton central */}
      <circle cx="20" cy="20" r="5" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill="#cc2200" />
      {/* Petits boutons gauche */}
      <circle cx="10" cy="10" r="2" fill="#fff" opacity="0.6" />
      <circle cx="15" cy="10" r="1.5" fill="#fff" opacity="0.4" />
    </svg>
  );
}

const ballById = (id) => POKEBALLS.find((b) => b.id === id) ?? POKEBALLS[0];

export default function ListsScreen() {
  const navigate = useNavigate();
  const [lists, setLists]           = useState({});
  const [owned, setOwned]           = useState({});
  const [modalVisible, setModal]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [inputName, setInputName]   = useState('');
  const [inputIcon, setInputIcon]   = useState('poke');

  useFocusEffect(useCallback(() => {
    getLists().then(setLists);
    getOwnedCards().then(setOwned);
  }, []));

  const openCreate = () => { setEditTarget(null); setInputName(''); setInputIcon('poke'); setModal(true); };
  const openEdit   = (list) => { setEditTarget(list); setInputName(list.name); setInputIcon(list.icon ?? 'poke'); setModal(true); };

  const handleConfirm = async () => {
    const name = inputName.trim();
    if (!name) return;
    const updated = editTarget
      ? await renameList(editTarget.id, name, inputIcon)
      : await createList(name, inputIcon);
    setLists(updated);
    setModal(false);
  };

  const handleDelete = (list) => {
    Alert.alert('Supprimer la liste', `Supprimer "${list.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { const updated = await deleteList(list.id); setLists(updated); },
      },
    ]);
  };

  const sorted = Object.values(lists).sort((a, b) => b.createdAt - a.createdAt);
  const totalOwned = Object.keys(owned).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
        <Text style={styles.createBtnText}>+ Nouvelle liste</Text>
      </TouchableOpacity>

      {/* ── Liste Pokédex épinglée ── */}
      <TouchableOpacity
        style={styles.pokedexCard}
        onPress={() => navigate('/lists/__pokedex__')}
      >
        <div style={{ marginRight: 12, flexShrink: 0 }}>
          <PokedexIcon size={40} />
        </div>
        <View style={styles.listInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.pokedexName}>Ma collection</Text>
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedBadgeText}>Épinglée</Text>
            </View>
          </View>
          <Text style={styles.listMeta}>
            {totalOwned} carte{totalOwned !== 1 ? 's' : ''} possédée{totalOwned !== 1 ? 's' : ''}
            <Text style={styles.listOwned}> · triées par sortie</Text>
          </Text>
        </View>
        <ChevronRight size={20} color="#444" strokeWidth={1.8} />
      </TouchableOpacity>

      {sorted.length === 0 ? (
        <View style={styles.center}>
          <PokeBallSVG ball={POKEBALLS[0]} size={56} />
          <Text style={[styles.empty, { marginTop: 14 }]}>Aucune liste pour l'instant</Text>
          <Text style={styles.emptySub}>Crée une liste pour organiser tes cartes</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const cardIds    = Object.keys(item.cards || {});
            const ownedCount = cardIds.filter((id) => owned[id]).length;
            const pct        = cardIds.length > 0 ? Math.round((ownedCount / cardIds.length) * 100) : 0;

            return (
              <TouchableOpacity
                style={styles.listCard}
                onPress={() => navigate(`/lists/${item.id}`, { state: { list: item } })}
                onLongPress={() => openEdit(item)}
              >
                {/* Pokéball icon */}
                <div style={{ marginRight: 12, flexShrink: 0 }}>
                  <PokeBallSVG ball={ballById(item.icon)} size={40} />
                </div>

                {/* Infos */}
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
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.progressPct}>{pct}%</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.listActions}>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={{ padding: 8 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color="#444" strokeWidth={1.8} />
                  </TouchableOpacity>
                  <ChevronRight size={20} color="#444" strokeWidth={1.8} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Modal création / édition ── */}
      {modalVisible && (
        <div
          className="modal-backdrop" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(false)}
        >
          <div
            style={{ backgroundColor: '#16213e', borderRadius: 18, padding: '22px 20px', width: '90%', maxWidth: 420, border: '1px solid #2a2a4a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, margin: '0 0 18px' }}>
              {editTarget ? 'Modifier la liste' : 'Nouvelle liste'}
            </p>

            {/* Nom */}
            <label style={{ display: 'block', fontFamily: fonts.regular, fontSize: 11, color: '#888', marginBottom: 5 }}>
              Nom
            </label>
            <input
              autoFocus
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setModal(false); }}
              placeholder="Nom de la liste…"
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 8, boxSizing: 'border-box',
                backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
                color: '#fff', fontFamily: fonts.regular, fontSize: 14, outline: 'none',
                marginBottom: 18,
              }}
            />

            {/* Icône pokéball */}
            <label style={{ display: 'block', fontFamily: fonts.regular, fontSize: 11, color: '#888', marginBottom: 10 }}>
              Icône
            </label>
            <PokeBallPicker value={inputIcon} onChange={setInputIcon} />

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setModal(false)}
                style={{ flex: 1, padding: 11, borderRadius: 8, backgroundColor: '#2a2a4a', border: 'none', color: '#aaa', fontFamily: fonts.semibold, cursor: 'pointer', fontSize: 14 }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={!inputName.trim()}
                style={{ flex: 1, padding: 11, borderRadius: 8, backgroundColor: inputName.trim() ? '#E63F00' : '#333', border: 'none', color: '#fff', fontFamily: fonts.bold, cursor: inputName.trim() ? 'pointer' : 'not-allowed', fontSize: 14 }}
              >
                {editTarget ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#1a1a2e' },
  createBtn:    { margin: 12, paddingTop: 12, paddingBottom: 12, borderRadius: 10, backgroundColor: '#E63F00', alignItems: 'center' },
  createBtnText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  empty:        { color: '#888', fontSize: 15, fontFamily: fonts.semibold },
  emptySub:     { color: '#555', fontSize: 13, marginTop: 4 },
  // Pokédex card
  pokedexCard:      { flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginRight: 12, marginBottom: 10, backgroundColor: '#1a1020', borderRadius: 12, padding: 12, border: '1px solid #3a1a3a' },
  pokedexName:      { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  pinnedBadge:      { backgroundColor: '#2e0028', borderRadius: 6, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2 },
  pinnedBadgeText:  { color: '#cc66cc', fontSize: 10, fontFamily: fonts.bold },
  list:         { paddingLeft: 12, paddingRight: 12, paddingBottom: 20 },
  listCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, marginBottom: 10, padding: 12, border: '1px solid #2a2a4a' },
  listInfo:     { flex: 1 },
  listName:     { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  listMeta:     { color: '#888', fontSize: 12, marginTop: 2 },
  listOwned:    { color: '#E63F00' },
  progressRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  progressBg:   { flex: 1, height: 3, backgroundColor: '#2a2a4a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 2 },
  progressPct:  { color: '#E63F00', fontSize: 10, fontFamily: fonts.bold, minWidth: 28, textAlign: 'right' },
  listActions:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
});
