export const getRequestPrefixFromName = (name?: string | null, fallback = 'REQ') => {
  const normalized = String(name || '').trim();
  if (!normalized) return fallback;

  const words = normalized.match(/[A-Za-z0-9]+/g) || [];
  if (words.length === 0) return fallback;

  if (words.length === 1) {
    return words[0].slice(0, 6).toUpperCase();
  }

  return words
    .map((word) => word[0])
    .join('')
    .slice(0, 8)
    .toUpperCase();
};

export const generateScopedRequestNumber = (scopeName?: string | null, fallbackPrefix = 'REQ') => {
  return `${getRequestPrefixFromName(scopeName, fallbackPrefix)}-${Date.now()}`;
};