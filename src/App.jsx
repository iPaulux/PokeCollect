import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLang, LANGUAGES } from './utils/LanguageContext.jsx';
import SetsScreen from './screens/SetsScreen';
import CardsScreen from './screens/CardsScreen';
import SearchScreen from './screens/SearchScreen';
import ListsScreen from './screens/ListsScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import FavoritesScreen from './screens/FavoritesScreen';

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const C = { bg: '#1a1a2e', surface: '#16213e', border: '#2a2a4a', accent: '#E63F00' };

// ─── Sélecteur de langue ──────────────────────────────────────────────────────
function LangPicker() {
  const { lang, setLang } = useLang();
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          style={{
            padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: lang === l.code ? C.accent : 'transparent',
            color: lang === l.code ? '#fff' : '#666',
            fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 600,
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ title, showBack, showLang }) {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      backgroundColor: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: '0 16px', height: 52, flexShrink: 0,
      gap: 12,
    }}>
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.accent, fontSize: 22, lineHeight: 1, padding: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          ‹
        </button>
      )}
      <span style={{ flex: 1, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff' }}>
        {title}
      </span>
      {showLang && <LangPicker />}
    </div>
  );
}

// ─── Onglets du bas ───────────────────────────────────────────────────────────
const TABS = [
  { path: '/',          label: '📦 Home',     match: (p) => p === '/' || p.startsWith('/sets') },
  { path: '/search',   label: '🔍 Search',   match: (p) => p.startsWith('/search') },
  { path: '/lists',    label: '📋 Lists',    match: (p) => p.startsWith('/lists') },
  { path: '/favorites',label: '★ Favoris',   match: (p) => p.startsWith('/favorites') },
];

function BottomTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div
      className="safe-bottom"
      style={{
        display: 'flex', flexShrink: 0,
        backgroundColor: C.surface,
        borderTop: `1px solid ${C.border}`,
        height: 56,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              color: active ? C.accent : '#555',
              fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 600,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Écrans avec header ───────────────────────────────────────────────────────
function SetsPage() {
  return (
    <>
      <Header title="Collection" showLang />
      <SetsScreen />
    </>
  );
}

function CardsPage() {
  const { state } = useLocation();
  const title = state?.set?.name ?? 'Cartes';
  return (
    <>
      <Header title={title} showBack />
      <CardsScreen />
    </>
  );
}

function SearchPage() {
  return (
    <>
      <Header title="Recherche" />
      <SearchScreen />
    </>
  );
}

function ListsPage() {
  return (
    <>
      <Header title="Mes Listes" />
      <ListsScreen />
    </>
  );
}

function ListDetailPage() {
  const { state } = useLocation();
  const [title, setTitle] = useState(state?.list?.name ?? 'Liste');
  return (
    <>
      <Header title={title} showBack />
      <ListDetailScreen onTitleChange={setTitle} />
    </>
  );
}

function FavoritesPage() {
  return (
    <>
      <Header title="Favoris" />
      <FavoritesScreen />
    </>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────
function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bg }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/"              element={<SetsPage />} />
          <Route path="/sets/:setId"   element={<CardsPage />} />
          <Route path="/search"        element={<SearchPage />} />
          <Route path="/lists"         element={<ListsPage />} />
          <Route path="/lists/:listId" element={<ListDetailPage />} />
          <Route path="/favorites"     element={<FavoritesPage />} />
        </Routes>
      </div>
      <BottomTabs />
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <LanguageProvider>
        <AppLayout />
      </LanguageProvider>
    </HashRouter>
  );
}
