import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLang, LANGUAGES } from './utils/LanguageContext.jsx';
import { renameList } from './utils/lists';
import { hydrateFromRemote } from './utils/persist';
import { supabase } from './utils/supabase';
import { Home, Search, List, ShoppingBag, Star, ChevronLeft, ScanLine } from 'lucide-react';
import SetsScreen from './screens/SetsScreen';
import CardsScreen from './screens/CardsScreen';
import SearchScreen from './screens/SearchScreen';
import ListsScreen from './screens/ListsScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProductsScreen from './screens/ProductsScreen';
import ScanScreen from './screens/ScanScreen';
import SplashScreen from './components/SplashScreen';
import AccountModal from './components/AccountModal';
import AuthScreen from './components/AuthScreen';
import PokeBallPicker, { PokeBallSVG, POKEBALLS } from './components/PokeBallPicker';

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
            color: C.accent, padding: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
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
  { path: '/',           label: 'Home',     Icon: Home,        match: (p) => p === '/' || p.startsWith('/sets') },
  { path: '/search',    label: 'Search',   Icon: Search,      match: (p) => p.startsWith('/search') },
  { path: '/scan',      label: 'Scan',     Icon: ScanLine,    match: (p) => p.startsWith('/scan') },
  { path: '/lists',     label: 'Lists',    Icon: List,        match: (p) => p.startsWith('/lists') },
  { path: '/favorites', label: 'Favoris',  Icon: Star,        match: (p) => p.startsWith('/favorites') },
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
        height: 60,
      }}
    >
      {TABS.map(({ path, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              color: active ? C.accent : '#4a4a6a',
              transition: 'color 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: 0,
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{
              fontFamily: 'Poppins, sans-serif', fontSize: 10, fontWeight: active ? 700 : 500,
              lineHeight: 1,
            }}>
              {label}
            </span>
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
function SetsPage({ session }) {
  const [accountVisible, setAccountVisible] = useState(false);

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
              padding: '4px 2px',
              display: 'flex', alignItems: 'center', flexShrink: 0,
              color: '#4caf50',
            }}
          >
            <img src="/TiploufICON.png" alt="compte" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          </button>
        }
      />
      <SetsScreen />
      <AccountModal visible={accountVisible} onClose={() => setAccountVisible(false)} session={session} />
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
  const [title, setTitle]           = useState(state?.list?.name ?? 'Liste');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput]     = useState('');
  const [iconInput, setIconInput]         = useState(state?.list?.icon ?? 'poke');
  const inputRef = useRef(null);

  const openRename = () => {
    setRenameInput(title);
    setRenameVisible(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmRename = async () => {
    const name = renameInput.trim();
    if (!name || !listId) return;
    await renameList(listId, name, iconInput);
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
            title="Modifier la liste"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', padding: '4px 2px',
              display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <PokeBallSVG ball={(POKEBALLS.find((b) => b.id === (state?.list?.icon ?? 'poke')) ?? POKEBALLS[0])} size={26} />
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
            style={{ backgroundColor: '#16213e', borderRadius: 18, padding: '22px 20px', width: '90%', maxWidth: 420, border: '1px solid #2a2a4a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, margin: '0 0 18px 0' }}>
              Modifier la liste
            </p>
            <label style={{ display: 'block', fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 5 }}>Nom</label>
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
                boxSizing: 'border-box', outline: 'none', marginBottom: 18,
              }}
            />
            <label style={{ display: 'block', fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 10 }}>Icône</label>
            <PokeBallPicker value={iconInput} onChange={setIconInput} />
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
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

function ScanPage() {
  return (
    <div style={pageStyle}>
      <Header title="Scanner une carte" />
      <ScanScreen />
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
function AppLayout({ session }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bg }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatedPage>
          <Routes>
            <Route path="/"              element={<SetsPage session={session} />} />
            <Route path="/sets/:setId"   element={<CardsPage />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/scan"          element={<ScanPage />} />
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
  const [session, setSession]       = useState(undefined); // undefined = chargement, null = déconnecté, objet = connecté

  useEffect(() => {
    if (!supabase) { setSession(null); return; }

    // Charge la session initiale
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      if (s) hydrateFromRemote();
    });

    // Écoute les changements (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (s) hydrateFromRemote();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Chargement initial — on attend de savoir si connecté ou non
  if (session === undefined) return null;

  // Non connecté → page de connexion
  if (!session) {
    return <AuthScreen onAuth={() => {}} />;
  }

  // Connecté → app complète
  return (
    <HashRouter>
      <LanguageProvider>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        <AppLayout session={session} />
      </LanguageProvider>
    </HashRouter>
  );
}
