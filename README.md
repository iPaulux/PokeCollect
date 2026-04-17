# 📦 PokeCollect

> Application mobile de suivi de collection de cartes Pokémon, construite avec React Native & Expo.

---

## ✨ Fonctionnalités

### 📦 Collection
- Parcours toutes les extensions TCG Pokémon triées par date de sortie (de la plus récente à la plus ancienne)
- Recherche d'un set **en français ou en anglais** (`Évolutions Prismatiques`, `prismatique`, `écarlate`…)
- Note indicative pour les langues FR 🇫🇷 et JA 🇯🇵 (visuels anglais, numérotation identique)

### 🃏 Cartes d'un set
- Grille 3 colonnes avec l'image de chaque carte
- **Tap** sur une carte → marquer comme possédée ✓ (bordure rouge) ou non possédée (grisée)
- Barre de progression `X / N cartes — XX%`
- Filtres : **Toutes · Possédées · Manquantes**
- Bouton 📋 sur chaque carte → ajouter à une liste personnalisée

### 🔍 Recherche
- Recherche par nom en **français ou en anglais** (`Salamèche` → Charmander, `Dracaufeu` → Charizard…)
  - 1 025 Pokémon couverts, insensible aux accents (`Evoli` = `Évoli`)
  - Indication 🔄 quand le nom a été traduit automatiquement
- Filtres par rareté : Commune · Peu Commune · Rare · Rare Holo · EX / GX / V · Ultra Rare · Promo
- Possibilité de combiner nom + rareté
- Même système de possession et d'ajout aux listes

### 📋 Mes Listes
- **Créer** autant de listes personnalisées que souhaité (wishlist, échanges, master set…)
- **Renommer** une liste via appui long
- **Supprimer** une liste (confirmation)
- Compteur possédées / total par liste
- Détail d'une liste : même grille + progression + filtres
- **Appui long sur une carte** dans une liste → la retirer

---

## 🗂️ Architecture

```
PokeCollect/
├── App.js                        # Navigation (tabs + stacks) + Language Provider
├── src/
│   ├── screens/
│   │   ├── SetsScreen.js         # Liste des extensions
│   │   ├── CardsScreen.js        # Cartes d'un set
│   │   ├── SearchScreen.js       # Recherche nom + rareté
│   │   ├── ListsScreen.js        # Gestion des listes perso
│   │   └── ListDetailScreen.js   # Détail d'une liste
│   ├── components/
│   │   └── AddToListModal.js     # Bottom sheet "Ajouter à une liste"
│   └── utils/
│       ├── storage.js            # Cartes possédées (AsyncStorage)
│       ├── lists.js              # Listes personnalisées (AsyncStorage)
│       ├── cache.js              # Cache API 24h (AsyncStorage)
│       ├── pokemonNames.js       # Traduction FR→EN des noms Pokémon (PokeAPI GraphQL)
│       ├── setNames.js           # Traduction FR→EN des noms de sets (mapping statique)
│       └── LanguageContext.js    # Contexte langue EN / FR / JA
```

---

## 🌐 APIs utilisées

| API | Usage |
|-----|-------|
| [Pokémon TCG API](https://pokemontcg.io/) `v2` | Sets, cartes, images |
| [PokeAPI GraphQL](https://beta.pokeapi.co/graphql/v1beta) | Noms FR→EN des 1 025 Pokémon |

### Cache
Toutes les données API sont mises en cache 24h dans `AsyncStorage` :
- `cache:v2:sets:en` — liste des sets
- `cache:v2:cards:<setId>` — cartes d'un set
- `fr_en_names_v2` — mapping noms Pokémon FR→EN

---

## 🚀 Lancer l'application

### Prérequis
- [Node.js](https://nodejs.org/) ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) ou [Expo Go](https://expo.dev/client) sur iPhone

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

## 📱 Captures d'écran

| Collection | Cartes d'un set | Recherche | Mes Listes |
|:-----------:|:---------------:|:---------:|:----------:|
| Liste des extensions triées par date | Grille 3 colonnes, possession en rouge | Nom FR/EN + filtre rareté | Listes perso avec progression |

---

## 🛠️ Stack technique

| Outil | Version |
|-------|---------|
| React Native | 0.81 |
| Expo | ~54 |
| React Navigation (native-stack + bottom-tabs) | 7.x |
| AsyncStorage | 3.x |
| React Native Web | 0.21 |

---

## 📝 Roadmap

- [ ] Export / import de collection (JSON)
- [ ] Statistiques globales (% complété par série)
- [ ] Support des sets japonais via une API dédiée
- [ ] Mode sombre / clair
- [ ] Scan de carte par caméra

---

## 👤 Auteur

Fait avec ❤️ par **Paul Guttin**
