// Mapping complet FR → EN pour les noms de sets TCG Pokémon
// Couvre toutes les séries principales jusqu'en 2026

const SET_FR_TO_EN = {
  // Mega Evolution (2025-2026)
  'ordre parfait': 'perfect order',
  'héros ascendants': 'ascended heroes',
  'flammes fantasmagoriques': 'phantasmal flames',
  'méga évolution': 'mega evolution',
  'blanc éblouissant': 'white flare',
  'foudre noire': 'black bolt',

  // Scarlet & Violet (2023-2025)
  'rivaux du destin': 'destined rivals',
  'ensemble, on avance': 'journey together',
  'évolutions prismatiques': 'prismatic evolutions',
  'étincelles déferlantes': 'surging sparks',
  'couronne stellaire': 'stellar crown',
  'la fable voilée': 'shrouded fable',
  'mascarade crépusculaire': 'twilight masquerade',
  'forces temporelles': 'temporal forces',
  'destinées de paldea': 'paldean fates',
  'fissure paradoxe': 'paradox rift',
  '151': '151',
  'flammes obsidiennes': 'obsidian flames',
  'évolutions à paldea': 'paldea evolved',
  'écarlate et violet': 'scarlet & violet',
  'scarlet & violet': 'scarlet & violet',

  // Sword & Shield (2020-2023)
  'zénith suprême': 'crown zenith',
  'galerie galatique': 'crown zenith galarian gallery',
  'tempête argentée': 'silver tempest',
  'origine perdue': 'lost origin',
  'radiance astrale': 'astral radiance',
  'étoiles brillantes': 'brilliant stars',
  'poing de fusion': 'fusion strike',
  'ciel évolutif': 'evolving skies',
  'règne de glace': 'chilling reign',
  'styles de combat': 'battle styles',
  'destinées radieuses': 'shining fates',
  'voltage éclatant': 'vivid voltage',
  'parcours du champion': "champion's path",
  'ténèbres embrasées': 'darkness ablaze',
  'règne du clash': 'rebel clash',
  'épée et bouclier': 'sword & shield',

  // Sun & Moon (2017-2019)
  'éclipse cosmique': 'cosmic eclipse',
  'destins cachés': 'hidden fates',
  'connexion des esprits': 'unified minds',
  'liens indéfectibles': 'unbroken bonds',
  'alliance infaillible': 'team up',
  'tonnerre perdu': 'lost thunder',
  'majesté des dragons': 'dragon majesty',
  'tempête céleste': 'celestial storm',
  'lumière interdite': 'forbidden light',
  'ultra-prisme': 'ultra prism',
  'invasion carmin': 'crimson invasion',
  'légendes brillantes': 'shining legends',
  'ombres ardentes': 'burning shadows',
  'gardiens ascendants': 'guardians rising',
  'soleil et lune': 'sun & moon',

  // XY (2013-2016)
  'évolutions': 'evolutions',
  'origines antiques': 'ancient origins',
  'ciel rugissant': 'roaring skies',
  'double crise': 'double crisis',
  'clash primordial': 'primal clash',
  'forces fantômes': 'phantom forces',
  'poings furieux': 'furious fists',
  'torches enflammées': 'flashfire',
  'xy': 'xy',
};

// Dictionnaire mot-à-mot pour les recherches partielles
const WORD_FR_TO_EN = {
  'écarlate': 'scarlet', 'ecarlate': 'scarlet',
  'épée': 'sword', 'epee': 'sword',
  'bouclier': 'shield',
  'évolution': 'evolution', 'evolution': 'evolution',
  'évolutions': 'evolutions', 'evolutions': 'evolutions',
  'prismatique': 'prismatic', 'prismatiques': 'prismatic',
  'étincelles': 'sparks', 'etincelles': 'sparks',
  'déferlantes': 'surging', 'deferlantes': 'surging',
  'coronaire': 'crown', 'couronne': 'crown', 'zénith': 'zenith', 'zenith': 'zenith',
  'stellaire': 'stellar',
  'mascarade': 'masquerade',
  'crépusculaire': 'twilight', 'crepusculaire': 'twilight',
  'temporelles': 'temporal', 'temporelle': 'temporal',
  'destinées': 'fates', 'destinees': 'fates', 'destins': 'fates',
  'paldea': 'paldea',
  'paradoxe': 'paradox',
  'obsidiennes': 'obsidian', 'obsidienne': 'obsidian',
  'flammes': 'flames', 'flamme': 'flames',
  'argentée': 'silver', 'argentee': 'silver',
  'radiance': 'radiance',
  'astrale': 'astral',
  'brillantes': 'brilliant', 'brillants': 'brilliant',
  'fusion': 'fusion',
  'éclipse': 'eclipse', 'eclipse': 'eclipse',
  'cosmique': 'cosmic',
  'tempête': 'storm', 'tempete': 'storm',
  'ombres': 'shadows',
  'ardentes': 'ablaze', 'ardent': 'ablaze',
  'ténèbres': 'darkness', 'tenebres': 'darkness',
  'soleil': 'sun',
  'lune': 'moon',
  'lumieres': 'lights', 'lumière': 'light',
  'voltage': 'voltage',
  'éclatant': 'vivid', 'eclatant': 'vivid',
  'fantômes': 'phantom', 'fantomes': 'phantom',
  'méga': 'mega', 'mega': 'mega',
  'héros': 'heroes', 'heros': 'heroes',
  'rivaux': 'rivals',
  'ensemble': 'journey',
  'fable': 'fable',
  'voilée': 'shrouded', 'voilee': 'shrouded',
  'origine': 'origin', 'origines': 'origins',
};

const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// ─── Reverse mapping: EN set name (lowercase) → French name (sentence case) ──
const _EN_TO_FR = {};
for (const [fr, en] of Object.entries(SET_FR_TO_EN)) {
  const key = en.toLowerCase();
  if (!_EN_TO_FR[key]) {
    // Skip identity entries ('scarlet & violet': 'scarlet & violet', '151': '151', etc.)
    const frNorm = normalize(fr);
    const enNorm = normalize(en);
    if (frNorm !== enNorm) {
      _EN_TO_FR[key] = fr.charAt(0).toUpperCase() + fr.slice(1);
    }
  }
}

/**
 * Returns the localized set name when lang === 'fr', otherwise returns the original.
 * Falls back to the English name if no French translation is available.
 */
export function getLocalizedSetName(setName, lang) {
  if (lang !== 'fr' || !setName) return setName;
  return _EN_TO_FR[setName.toLowerCase()] ?? setName;
}

/**
 * Traduit une query FR en EN pour rechercher dans les noms de sets.
 * Retourne { translated: string, wasFrench: boolean }
 */
export function resolveSetQuery(query) {
  const q = query.trim().toLowerCase();
  const qNorm = normalize(q);

  if (!q) return { translated: q, wasFrench: false };

  // 1. Correspondance exacte dans le map FR→EN complet
  const exact = SET_FR_TO_EN[q] || SET_FR_TO_EN[qNorm];
  if (exact) return { translated: exact, wasFrench: true };

  // 2. Correspondance partielle : le nom FR contient la query
  const partial = Object.entries(SET_FR_TO_EN).find(
    ([fr]) => normalize(fr).includes(qNorm)
  );
  if (partial) return { translated: partial[1], wasFrench: true };

  // 3. Traduction mot-à-mot
  const words = qNorm.split(/\s+/);
  const translatedWords = words.map((w) => WORD_FR_TO_EN[w] || WORD_FR_TO_EN[normalize(w)] || w);
  const wordTranslation = translatedWords.join(' ');

  if (wordTranslation !== qNorm) {
    return { translated: wordTranslation, wasFrench: true };
  }

  return { translated: q, wasFrench: false };
}

/**
 * Filtre une liste de sets selon une query (supporte FR et EN).
 */
export function filterSets(sets, query) {
  if (!query.trim()) return sets;

  const { translated, wasFrench } = resolveSetQuery(query);

  // On cherche dans le nom ET dans la série, avec la query originale ET traduite
  const searchTerms = [normalize(query)];
  if (wasFrench) searchTerms.push(normalize(translated));

  return sets.filter((s) => {
    const name = normalize(s.name);
    const series = normalize(s.series || '');
    const id = (s.id || '').toLowerCase();
    return searchTerms.some((term) => name.includes(term) || series.includes(term) || id.includes(term.toLowerCase()));
  });
}
