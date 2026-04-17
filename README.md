# 📦 PokeCollect

> Application mobile de suivi de collection de cartes Pokémon, construite avec React Native & Expo.

---

## ✨ Fonctionnalités

### 📦 Collection
- Parcours toutes les extensions TCG Pokémon triées par date de sortie
- Recherche d'un set **en français ou en anglais** (`Évolutions Prismatiques`, `prismatique`, `écarlate`…)
- Note indicative pour les langues FR 🇫🇷 et JA 🇯🇵 (visuels anglais, numérotation identique)

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
- **Renommer** une liste via appui long
- **Supprimer** une liste (confirmation)
- Compteur possédées / total par liste
- Détail d'une liste : même grille + progression + filtres
- **Appui long sur une carte** dans une liste → la retirer

### 🛍️ Produits
- Catalogue de produits TCG scellés : boosters, displays, ETB, tins, coffrets, decks
- Filtres par type + barre de recherche (nom, set, série)
- Logo du set affiché sur chaque produit
- **Fiche produit** au tap :
  - Contenu détaillé (boosters, cartes promo, accessoires…)
  - Informations set & série, date de sortie
  - **Prix indicatifs Cardmarket** (mis à jour avril 2026, reflètent le marché secondaire réel)
  - Bouton **🛒 Voir sur Cardmarket** — recherche directe du produit
  - Bouton **Voir les cartes du set →** — navigation vers la collection du set

---

## 🗂️ Architecture

```
PokeCollect/
├── App.js                        # Navigation (tabs + stacks) + chargement fonts Poppins
├── src/
│   ├── screens/
│   │   ├── SetsScreen.js         # Liste des extensions
│   │   ├── CardsScreen.js        # Cartes d'un set
│   │   ├── SearchScreen.js       # Recherche nom + rareté
│   │   ├── ListsScreen.js        # Gestion des listes perso
│   │   ├── ListDetailScreen.js   # Détail d'une liste
│   │   ├── ItemsScreen.js        # Catalogue produits scellés
│   │   └── ItemDetailScreen.js   # Fiche produit
│   ├── components/
│   │   ├── AnimatedSplash.js     # Splash screen animé (fade + scale + slide)
│   │   ├── CardDetailModal.js    # Modal fiche carte (prix, rareté, collection, listes)
│   │   └── AddToListModal.js     # Bottom sheet "Ajouter à une liste"
│   ├── data/
│   │   └── products.js           # Base de données statique des produits TCG (~35 références)
│   └── utils/
│       ├── theme.js              # Constantes globales (fonts Poppins, couleurs)
│       ├── storage.js            # Cartes possédées (AsyncStorage)
│       ├── lists.js              # Listes personnalisées (AsyncStorage)
│       ├── cache.js              # Cache API 24h (AsyncStorage, version v3)
│       ├── pokemonNames.js       # Traduction FR→EN des noms Pokémon (PokeAPI GraphQL)
│       ├── setNames.js           # Traduction FR→EN des noms de sets (mapping statique)
│       └── LanguageContext.js    # Contexte langue EN / FR / JA
```

---

## 🌐 APIs utilisées

| API | Usage |
|-----|-------|
| [Pokémon TCG API](https://pokemontcg.io/) `v2` | Sets, cartes, images, **prix Cardmarket & TCGPlayer en temps réel** |
| [PokeAPI GraphQL](https://beta.pokeapi.co/graphql/v1beta) | Noms FR→EN des 1 025 Pokémon |

### Cache
Toutes les données API sont mises en cache 24h dans `AsyncStorage` :

| Clé | Contenu |
|-----|---------|
| `cache:v3:sets:en` | Liste de tous les sets |
| `cache:v3:cards:<setId>` | Cartes d'un set (triées numériquement) |
| `cache:v3:fullcard:<cardId>` | Fiche complète d'une carte (prix inclus) |
| `fr_en_names_v2` | Mapping noms Pokémon FR→EN |

---

## 💶 Prix des produits

Il n'existe pas d'API publique gratuite pour les produits scellés Pokémon (Cardmarket est fermé aux nouveaux développeurs). Les prix de l'onglet **Produits** sont des **prix relevés manuellement sur Cardmarket** — ils reflètent le marché secondaire, pas le MSRP :

| Produit | Prix indicatif (avril 2026) |
|---------|----------------------------|
| Booster Évolutions Prismatiques | 9.50 € |
| Display Évolutions Prismatiques | 295 € |
| ETB Évolutions Prismatiques | 95 € |
| Booster 151 | 7.50 € |
| Display 151 | 220 € |
| ETB 151 | 78 € |

> Les prix des **cartes individuelles** sont en **temps réel** via l'API Pokémon TCG (source Cardmarket).

---

## 🎨 Design

- **Police** : [Poppins](https://fonts.google.com/specimen/Poppins) (Google Fonts) — Regular, Medium, SemiBold, Bold, ExtraBold
- **Thème** : sombre (`#1a1a2e` / `#16213e`) avec accent rouge `#E63F00`
- **Splash screen** animé au lancement : scale-up du logo + slide du titre + fade-out

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
- [Expo Go](https://expo.dev/client) sur iPhone

### Installation

```bash
git clone <repo>
cd PokeCollect
npm install
```

### Démarrage

```bash
# Sur iPhone (via Expo Go)
npm run start
# Scanner le QR code avec l'app Expo Go

# Dans le navigateur web
npm run web

# Simulateur iOS (macOS requis)
npm run ios
```

---

## 📱 Onglets

| Onglet | Description |
|:------:|-------------|
| 📦 Collection | Tous les sets TCG, recherche FR/EN, navigation vers les cartes |
| 🔍 Recherche | Recherche par nom Pokémon (FR/EN) + filtre rareté |
| 📋 Mes Listes | Listes personnalisées (wishlist, master set, échanges…) |
| 🛍️ Produits | Catalogue boosters/displays/ETB avec prix marché |

---

## 🛠️ Stack technique

| Outil | Version |
|-------|---------|
| React Native | 0.81 |
| Expo | ~54 |
| React Navigation (native-stack + bottom-tabs) | 7.x |
| AsyncStorage | 3.x |
| Poppins (expo-google-fonts) | 0.4.x |
| React Native Web | 0.21 |

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
