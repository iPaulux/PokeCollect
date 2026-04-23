import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLang, LANGUAGES } from './utils/LanguageContext.jsx';
import { renameList } from './utils/lists';
import { hydrateFromRemote } from './utils/persist';
import { supabase } from './utils/supabase';
import SetsScreen from './screens/SetsScreen';
import CardsScreen from './screens/CardsScreen';
import SearchScreen from './screens/SearchScreen';
import ListsScreen from './screens/ListsScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProductsScreen from './screens/ProductsScreen';
import SplashScreen from './components/SplashScreen';
import AccountModal from './components/AccountModal';

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
function Header({ title, showBack, showLang, rightComponent }) {
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
      <span style={{ flex: 1, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {showLang && <LangPicker />}
      {rightComponent}
    </div>
  );
}

// ─── Onglets du bas ───────────────────────────────────────────────────────────
const TABS = [
  { path: '/',           label: '📦 Home',     match: (p) => p === '/' || p.startsWith('/sets') },
  { path: '/search',    label: '🔍 Search',   match: (p) => p.startsWith('/search') },
  { path: '/lists',     label: '📋 Lists',    match: (p) => p.startsWith('/lists') },
  { path: '/products',  label: '🛍️ Produits', match: (p) => p.startsWith('/products') },
  { path: '/favorites', label: '★ Favoris',   match: (p) => p.startsWith('/favorites') },
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
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Animated page wrapper — se re-monte à chaque changement d'onglet ─────────
function AnimatedPage({ children }) {
  const { pathname } = useLocation();
  // On utilise uniquement le segment racine comme clé → animation au changement d'onglet
  // mais pas lors des navigations internes (sets → cards)
  const tab = '/' + (pathname.split('/')[1] || '');
  return (
    <div
      key={tab}
      style={{
        display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
        animation: 'tabFadeSlide 0.22s ease both',
      }}
    >
      {children}
    </div>
  );
}

// ─── Conteneur de page simple (navigation interne sans animation d'onglet) ────
const pageStyle = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' };

// ─── Écrans avec header ───────────────────────────────────────────────────────
function SetsPage() {
  const [accountVisible, setAccountVisible] = useState(false);
  const [loggedIn, setLoggedIn]             = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Vérifie la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    // Écoute les changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={pageStyle}>
      <Header
        title="Collection"
        showLang
        rightComponent={
          <button
            onClick={() => setAccountVisible(true)}
            title="Mon compte"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, padding: '4px 2px',
              display: 'flex', alignItems: 'center', flexShrink: 0,
              color: loggedIn ? '#4caf50' : '#555',
            }}
          >
            ☁
          </button>
        }
      />
      <SetsScreen />
      <AccountModal visible={accountVisible} onClose={() => setAccountVisible(false)} />
    </div>
  );
}

function CardsPage() {
  const { state } = useLocation();
  const title = state?.set?.name ?? 'Cartes';
  return (
    <div style={pageStyle}>
      <Header title={title} showBack />
      <CardsScreen />
    </div>
  );
}

function SearchPage() {
  return (
    <div style={pageStyle}>
      <Header title="Recherche" />
      <SearchScreen />
    </div>
  );
}

function ListsPage() {
  return (
    <div style={pageStyle}>
      <Header title="Mes Listes" />
      <ListsScreen />
    </div>
  );
}

function ListDetailPage() {
  const { state } = useLocation();
  const listId = state?.list?.id;
  const [title, setTitle] = useState(state?.list?.name ?? 'Liste');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const inputRef = useRef(null);

  const openRename = () => {
    setRenameInput(title);
    setRenameVisible(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmRename = async () => {
    const name = renameInput.trim();
    if (!name || !listId) return;
    await renameList(listId, name);
    setTitle(name);
    setRenameVisible(false);
  };

  return (
    <div style={pageStyle}>
      <Header
        title={title}
        showBack
        rightComponent={
          <button
            onClick={openRename}
            title="Renommer la liste"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: 17, padding: '4px 2px',
              display: 'flex', alignItems: 'center', lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✏️
          </button>
        }
      />
      <ListDetailScreen onTitleChange={setTitle} />

      {renameVisible && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRenameVisible(false)}
        >
          <div
            style={{ backgroundColor: '#16213e', borderRadius: 14, padding: 20, width: '85%', maxWidth: 400, border: '1px solid #2a2a4a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, margin: '0 0 14px 0' }}>
              Renommer la liste
            </p>
            <input
              ref={inputRef}
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setRenameVisible(false);
              }}
              placeholder="Nom de la liste..."
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
                borderRadius: 8, color: '#fff',
                fontFamily: 'Poppins, sans-serif', fontSize: 15,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setRenameVisible(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, backgroundColor: '#2a2a4a', border: 'none', color: '#aaa', fontFamily: 'Poppins, sans-serif', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Annuler
              </button>
              <button
                onClick={confirmRename}
                style={{ flex: 1, padding: '10px', borderRadius: 8, backgroundColor: '#E63F00', border: 'none', color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              >
                Renommer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsPage() {
  return (
    <div style={pageStyle}>
      <Header title="Produits" />
      <ProductsScreen />
    </div>
  );
}

function FavoritesPage() {
  return (
    <div style={pageStyle}>
      <Header title="Favoris" />
      <FavoritesScreen />
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────
function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bg }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatedPage>
          <Routes>
            <Route path="/"              element={<SetsPage />} />
            <Route path="/sets/:setId"   element={<CardsPage />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/lists"         element={<ListsPage />} />
            <Route path="/lists/:listId" element={<ListDetailPage />} />
            <Route path="/products"      element={<ProductsPage />} />
            <Route path="/favorites"     element={<FavoritesPage />} />
          </Routes>
        </AnimatedPage>
      </div>
      <BottomTabs />
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  // Hydratation depuis Supabase quand l'utilisateur est connecté
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateFromRemote();
    });
  }, []);

  return (
    <HashRouter>
      <LanguageProvider>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        <AppLayout />
      </LanguageProvider>
    </HashRouter>
  );
}
