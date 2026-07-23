/*
 * Sub-regional taxonomy for grouping countries in the directory.
 * Region names are localized (en/es). Codes not listed fall back to 'other'.
 * Extend REGION_OF as staged countries are promoted.
 */
export const REGIONS = [
  { key: 'north-america', en: 'North America', es: 'América del Norte' },
  { key: 'central-america', en: 'Central America', es: 'América Central' },
  { key: 'caribbean', en: 'Caribbean', es: 'Caribe' },
  { key: 'south-america', en: 'South America', es: 'América del Sur' },
  { key: 'northern-europe', en: 'Northern Europe', es: 'Europa del Norte' },
  { key: 'western-europe', en: 'Western Europe', es: 'Europa Occidental' },
  { key: 'southern-europe', en: 'Southern Europe', es: 'Europa del Sur' },
  { key: 'eastern-europe', en: 'Eastern Europe', es: 'Europa del Este' },
  { key: 'asia', en: 'Asia', es: 'Asia' },
  { key: 'africa', en: 'Africa', es: 'África' },
  { key: 'oceania', en: 'Oceania', es: 'Oceanía' },
  { key: 'other', en: 'Other', es: 'Otros' },
];

const REGION_OF = {
  // North America
  us: 'north-america', ca: 'north-america',
  // Central America
  cr: 'central-america', gt: 'central-america', sv: 'central-america',
  hn: 'central-america', ni: 'central-america', pa: 'central-america',
  bz: 'central-america', mx: 'central-america',
  // Caribbean
  do: 'caribbean', cu: 'caribbean', ht: 'caribbean', jm: 'caribbean', tt: 'caribbean',
  // South America
  br: 'south-america', ar: 'south-america', pe: 'south-america', cl: 'south-america',
  co: 'south-america', uy: 'south-america', py: 'south-america', bo: 'south-america',
  ec: 'south-america', ve: 'south-america',
  // Northern Europe
  gb: 'northern-europe', ie: 'northern-europe', se: 'northern-europe', no: 'northern-europe',
  dk: 'northern-europe', fi: 'northern-europe', is: 'northern-europe', ee: 'northern-europe',
  lv: 'northern-europe', lt: 'northern-europe',
  // Western Europe
  fr: 'western-europe', de: 'western-europe', nl: 'western-europe', be: 'western-europe',
  at: 'western-europe', ch: 'western-europe', lu: 'western-europe', li: 'western-europe',
  // Southern Europe
  es: 'southern-europe', it: 'southern-europe', pt: 'southern-europe', gr: 'southern-europe',
  hr: 'southern-europe', si: 'southern-europe', mt: 'southern-europe', cy: 'southern-europe',
  rs: 'southern-europe',
  // Eastern Europe
  hu: 'eastern-europe', pl: 'eastern-europe', cz: 'eastern-europe', sk: 'eastern-europe',
  ro: 'eastern-europe', bg: 'eastern-europe', ua: 'eastern-europe', md: 'eastern-europe',
  // Asia
  jp: 'asia', kr: 'asia', cn: 'asia', in: 'asia', sg: 'asia', tr: 'asia', il: 'asia',
  // Oceania
  au: 'oceania', nz: 'oceania',
};

export const getRegion = (code) => REGION_OF[code] || 'other';

export const getRegionName = (key, lang) => {
  const region = REGIONS.find((r) => r.key === key);
  if (!region) return key;
  return lang === 'es' ? region.es : region.en;
};
