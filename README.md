# 📦 PokeCollect

> Application web progressive (PWA) de suivi de collection de cartes Pokémon, construite avec React + Vite.

---

## ✨ Fonctionnalités

### 📦 Collection (Sets)
- Parcours toutes les extensions TCG Pokémon triées par date de sortie
- **Noms des sets en français** quand la langue FR est active (mapping statique complet)
- **Tag PTCGO** affiché sur chaque set (ex : `MEW` pour 151, `ME2` pour Phantasmal Flames)
- Recherche d'un set **en français ou en anglais** (`Évolutions Prismatiques`, `prismatique`, `écarlate`…)
- Note indicative pour les langues FR 🇫🇷 et JA 🇯🇵 (visuels anglais, numérotation identique)
- Vue **liste** ou **grille** au choix
- Barre de progression par set (cartes possédées / total)
- Favoris par set (étoile ★)

### 🃏 Cartes d'un set
- Grille 3 colonnes avec l'image de chaque carte
- **Tap** sur une carte → ouvre la **fiche détaillée**
- Barre de progression `X / N cartes — XX%`
- Filtres : **Toutes · Possédées · Manquantes**
- Tri correct des numéros : 1, 2, 3… puis SV, TG, GG…

### 🔍 Fiche carte (modal)
- Grande image de la carte
- **Rareté abrégée colorée** : SAR · AR · HR · RR · UR · SR · ACE · H · C · U · R…
- Artiste · N° dans le set
- **Prix du marché en temps réel** (Cardmarket + TCGPlayer) via l'API Pokémon TCG
- Bouton **✓ Ma collection** — marquer comme possédée / non possédée
- Bouton **★ Favoris** — ajouter/retirer des favoris
- Section **🏆 Grading** — enregistrer le grade PSA / BGS / CGC / TAG / ACE
- Bouton **📋 Ajouter à une liste** personnalisée
- Bouton **🛒 Voir sur Cardmarket** — lien direct vers la fiche de la carte

### 🔍 Recherche
- Recherche par nom en **français ou en anglais** (`Salamèche` → Charmander, `Dracaufeu` → Charizard…)
  - 1 025 Pokémon couverts, insensible aux accents (`Evoli` = `Évoli`)
  - Indication 🔄 quand le nom a été traduit automatiquement
- Filtres par rareté : Commune · Peu Commune · Rare · Rare Holo · EX / GX / V · Ultra Rare · Promo
- Combinaison nom + rareté possible
- Même fiche détaillée au tap

### 📋 Mes Listes
- **Créer** autant de listes personnalisées que souhaité (wishlist, échanges, master set…)
- **Renommer** une liste :
  - Via appui long sur la liste dans l'écran principal
  - Via le bouton **✏️** dans l'en-tête de la liste ouverte
- **Supprimer** une liste (confirmation)
- Compteur possédées / total + barre de progression par liste
- Détail d'une liste : grille **ou** vue liste + filtres Toutes / Possédées / Manquantes
- **Tap sur une carte** → ouvre la fiche détaillée (avec toggle collection, favoris, grading)
- **Appui long sur une carte** → la retirer de la liste

### ★ Favoris
- Sets et cartes favoris regroupés dans un onglet dédié
- Tap sur un set favori → navigation vers ses cartes
- Tap sur une carte favorite → fiche détaillée

---

## 🗂️ Architecture

```
PokeCollect/
├── index.html
├── vite.config.js
└── src/
    ├── App.jsx                     # Routing (HashRouter) + Header + BottomTabs
    ├── main.jsx                    # Point d'entrée React
    ├── screens/
    │   ├── SetsScreen.jsx          # Liste des extensions (liste/grille, FR names, ptcgoCode)
    │   ├── CardsScreen.jsx         # Cartes d'un set
    │   ├── SearchScreen.jsx        # Recherche nom + rareté
    │   ├── ListsScreen.jsx         # Gestion des listes perso
    │   ├── ListDetailScreen.jsx    # Détail d'une liste (modal carte, renommage)
    │   └── FavoritesScreen.jsx     # Favoris sets + cartes
    ├── components/
    │   ├── rn-web.jsx              # Shim React Native → DOM (View, Text, FlatList…)
    │   ├── CardDetailModal.jsx     # Modal fiche carte (prix, rareté, grading, listes)
    │   └── AddToListModal.jsx      # Bottom sheet "Ajouter à une liste"
    ├── data/
    │   └── products.js             # Base de données statique des produits TCG
    └── utils/
        ├── theme.js                # Constantes globales (fonts Poppins, couleurs)
        ├── storage.js              # Cartes possédées + favoris + grading (localStorage)
        ├── lists.js                # Listes personnalisées (localStorage)
        ├── cache.js                # Cache API 24h (localStorage)
        ├── persist.js              # Couche d'abstraction localStorage
        ├── pokemonNames.js         # Traduction FR→EN des noms Pokémon (PokeAPI GraphQL)
        ├── setNames.js             # Traduction FR↔EN des noms de sets + noms localisés
        └── LanguageContext.jsx     # Contexte langue EN / FR / JA
```

---

## 🌐 APIs utilisées

| API | Usage |
|-----|-------|
| [Pokémon TCG API](https://pokemontcg.io/) `v2` | Sets (nom EN, logo, ptcgoCode), cartes, images, **prix Cardmarket & TCGPlayer en temps réel** |
| [PokeAPI GraphQL](https://beta.pokeapi.co/graphql/v1beta) | Noms FR→EN des 1 025 Pokémon |

> **Note** : L'API Pokémon TCG ne fournit pas de noms de sets en français. Les noms FR sont gérés via un mapping statique dans `setNames.js` (toutes les séries principales jusqu'en 2026 couvertes).

### Cache

Toutes les données API sont mises en cache 24h dans `localStorage` :

| Clé | Contenu |
|-----|---------|
| `cache:v3:sets:en` | Liste de tous les sets |
| `cache:v3:cards:<setId>` | Cartes d'un set (triées numériquement) |
| `cache:v3:fullcard:<cardId>` | Fiche complète d'une carte (prix inclus) |
| `fr_en_names_v2` | Mapping noms Pokémon FR→EN |

---

## 🎨 Design

- **Police** : [Poppins](https://fonts.google.com/specimen/Poppins) (Google Fonts) — Regular, Medium, SemiBold, Bold, ExtraBold
- **Thème** : sombre (`#1a1a2e` / `#16213e`) avec accent rouge `#E63F00`

### Raretés abrégées (fiche carte)

| Abréviation | Rareté complète |
|:-----------:|-----------------|
| SAR | Special Illustration Rare |
| AR | Illustration Rare |
| HR | Hyper Rare |
| RR | Double Rare |
| UR / SR | Ultra Rare / Secret Rare |
| ACE | ACE SPEC Rare |
| H | Rare Holo |
| R / U / C | Rare / Uncommon / Common |

---

## 🚀 Lancer l'application

### Prérequis
- [Node.js](https://nodejs.org/) ≥ 18

### Installation

```bash
git clone <repo>
cd PokeCollect
npm install
```

### Démarrage

```bash
# Serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

---

## 📱 Onglets

| Onglet | Description |
|:------:|-------------|
| 📦 Home | Tous les sets TCG (noms FR, tag PTCGO, vue liste/grille, favoris) |
| 🔍 Search | Recherche par nom Pokémon (FR/EN) + filtre rareté |
| 📋 Lists | Listes personnalisées (wishlist, master set, échanges…) |
| ★ Favoris | Sets et cartes mis en favoris |

---

## 🛠️ Stack technique

| Outil | Version |
|-------|---------|
| React | 18 |
| Vite | 6 |
| React Router DOM | 6 |
| rn-web shim | maison (View, Text, FlatList, Modal… → DOM) |
| Poppins | Google Fonts (CDN) |

---

## 📝 Roadmap

- [ ] Export / import de collection (JSON)
- [ ] Statistiques globales (% complété par série, valeur estimée de la collection)
- [ ] Support des sets japonais via une API dédiée
- [ ] Scan de carte par caméra
- [ ] Notifications de sortie de nouveaux sets
- [ ] Intégration Cardmarket API (prix live produits scellés) si accès obtenu

---

## 👤 Auteur

Fait avec ❤️ par **Paul Guttin**
