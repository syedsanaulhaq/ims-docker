import { ApiOfficeResponse, ApiWingResponse, ApiDecResponse } from '@/services/officeApi';

export interface NameResolver {
  resolveOfficeNames: (ids: (string | number)[]) => string[];
  resolveWingNames: (ids: (string | number)[]) => string[];
  resolveDecNames: (ids: (string | number)[]) => string[];
}

export const createNameResolver = (
  offices: ApiOfficeResponse[],
  wings: ApiWingResponse[],
  decs: ApiDecResponse[]
): NameResolver => {
  // Create lookup maps for quick access
  const officeMap = new Map<number, string>();
  const wingMap = new Map<number, string>();
  const decMap = new Map<number, string>();

  // Populate office map
  offices.forEach(office => {
    officeMap.set(office.Id, office.Name);
  });

  // Populate wing map
  wings.forEach(wing => {
    wingMap.set(wing.Id, wing.Name);
  });

  // Populate DEC map
  decs.forEach(dec => {
    decMap.set(dec.Id, dec.Name);
  });

  return {
    resolveOfficeNames: (ids: (string | number)[]) => {
      return ids.map(id => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        const name = officeMap.get(numericId);
        return name || `Office-${id}`;
      });
    },

    resolveWingNames: (ids: (string | number)[]) => {
      return ids.map(id => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        const name = wingMap.get(numericId);
        return name || `Wing-${id}`;
      });
    },

    resolveDecNames: (ids: (string | number)[]) => {
      return ids.map(id => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        const name = decMap.get(numericId);
        return name || `DEC-${id}`;
      });
    }
  };
};

// Utility function to format names for display
export const formatNamesForDisplay = (names: string[], type: string): string => {
  if (names.length === 0) return `No ${type}`;
  if (names.length === 1) return names[0];
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} + ${names.length - 2} more`;
};

// Utility function to format names with IDs for tooltips
export const formatNamesWithIds = (names: string[], ids: (string | number)[]): string => {
  if (names.length !== ids.length) return '';
  return names.map((name, index) => `${name} (ID: ${ids[index]})`).join(', ');
};
