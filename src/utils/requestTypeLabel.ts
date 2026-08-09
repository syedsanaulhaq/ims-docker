const normalizeRequestType = (value: string | null | undefined): string => {
  return String(value || '').trim().toLowerCase();
};

export const getRequestTypeLabel = (requestType: string | null | undefined, scopeType?: string | null): string => {
  const normalizedRequestType = normalizeRequestType(requestType);
  const normalizedScopeType = normalizeRequestType(scopeType);

  if (normalizedRequestType === 'branch' || normalizedScopeType === 'branch') {
    return 'Branch Request';
  }

  if (normalizedRequestType === 'individual' || normalizedRequestType === 'personal' || normalizedScopeType === 'individual') {
    return 'Personal Request';
  }

  if (normalizedRequestType === 'organizational' || normalizedRequestType === 'wing' || normalizedScopeType === 'organizational') {
    return 'Wing Request';
  }

  if (normalizedRequestType === 'procurement' || normalizedRequestType === 'tender') {
    return 'Procurement Request';
  }

  if (!normalizedRequestType) {
    return 'Request';
  }

  return normalizedRequestType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
