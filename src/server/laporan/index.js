import * as biCare  from './modules/bicare.js';
import * as biDrive from './modules/bidrive.js';
import * as biMeal  from './modules/bimeal.js';
import * as biMeet  from './modules/bimeet.js';
import * as biStay  from './modules/bistay.js';
import * as biDocs  from './modules/bidocs.js';

const REGISTRY = {
  'bi-care':  biCare,
  'bi-drive': biDrive,
  'bi-meal':  biMeal,
  'bi-meet':  biMeet,
  'bi-stay':  biStay,
  'bi-docs':  biDocs,
};

export function getAdapter(key) { return REGISTRY[key] || null; }
export function listKnownModules() { return Object.keys(REGISTRY); }

export function normalizeModule(raw = '') {
  const k = String(raw).toLowerCase().trim();
  const map = {
    // existing
    'bi-care':'bi-care','bicare':'bi-care','bi_care':'bi-care',"d'care":'bi-care','dcare':'bi-care',
    'bi-drive':'bi-drive','bidrive':'bi-drive','bi_drive':'bi-drive',"d'move":'bi-drive','dmove':'bi-drive',
    // new
    'bi-meal':'bi-meal','bimeal':'bi-meal','bi_meal':'bi-meal',
    'bi-meet':'bi-meet','bimeet':'bi-meet','bi_meet':'bi-meet',
    'bi-stay':'bi-stay','bistay':'bi-stay','bi_stay':'bi-stay',
    'bi-docs':'bi-docs','bidocs':'bi-docs','bi_docs':'bi-docs','bi-mail':'bi-docs','bimail':'bi-docs','docs':'bi-docs','mail':'bi-docs',
  };
  return map[k] || k;
}
