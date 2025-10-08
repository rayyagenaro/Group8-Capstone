// src/lib/acl.js
export const SERVICE_ID_TO_KEY = { 1:'bidrive', 2:'bicare', 3:'bimeal', 4:'bimeet', 5:'bimail', 6:'bistay' };

export const KEY_TO_ALIASES = {
  bidrive:['bi-drive','bidrive','drive'],
  bicare:['bi-care','bicare','care'],
  bimeal:['bi-meal','bimeal','meal'],
  bimeet:['bi-meet','bimeet','meet'],
  bistay:['bi-stay','bistay','stay'],
};

export const CANONICAL_TO_UI = {
  bidrive:'bi-drive', bicare:'bi-care', bimeal:'bi-meal', bimeet:'bi-meet', bimail:'bi-docs', bistay:'bi-stay'
};

export function normalizeModule(input){
  const s = String(input||'').trim().toLowerCase();
  for (const [key, aliases] of Object.entries(KEY_TO_ALIASES)){
    if (aliases.includes(s)) return key;
  }
  return null;
}

export function allowedCanonicalKeysFromPayload(payload){
  const roleStr = String(payload?.role || payload?.role_name || '').toLowerCase();
  if (payload?.isSuper || roleStr.includes('super')) return Object.keys(KEY_TO_ALIASES);
  const ids = Array.isArray(payload?.service_ids) ? payload.service_ids : [];
  return ids.map(id => SERVICE_ID_TO_KEY[id]).filter(Boolean);
}

export function isModuleAllowed(payload, moduleParam){
  const key = normalizeModule(moduleParam);
  if (!key) return false;
  const allowed = allowedCanonicalKeysFromPayload(payload);
  return allowed.includes(key);
}

export function buildUiOptionsForPayload(payload){
  const allowedKeys = allowedCanonicalKeysFromPayload(payload);
  const uiValues = allowedKeys.map(k => CANONICAL_TO_UI[k]);
  const ORDER = ['bi-care','bi-drive','bi-meal','bi-meet','bi-stay','bi-docs'];
  return uiValues.sort((a,b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}
