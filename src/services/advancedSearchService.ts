export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn';
  value: any;
  value2?: any; // For 'between' operator
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchConfig {
  query?: string;
  filters?: SearchFilter[];
  sort?: SortOption[];
  limit?: number;
  offset?: number;
  fuzzySearch?: boolean;
  highlightMatches?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  executionTime: number;
  query: SearchConfig;
  facets?: Record<string, { value: string; count: number }[]>;
}

export class AdvancedSearchService {
  private static instance: AdvancedSearchService;

  private constructor() {}

  public static getInstance(): AdvancedSearchService {
    if (!AdvancedSearchService.instance) {
      AdvancedSearchService.instance = new AdvancedSearchService();
    }
    return AdvancedSearchService.instance;
  }

  public search<T extends Record<string, any>>(
    data: T[],
    config: SearchConfig,
    searchableFields: string[] = []
  ): SearchResult<T> {
    const startTime = performance.now();
    let results = [...data];

    // Apply text search
    if (config.query && searchableFields.length > 0) {
      results = this.applyTextSearch(results, config.query, searchableFields, config.fuzzySearch);
    }

    // Apply filters
    if (config.filters && config.filters.length > 0) {
      results = this.applyFilters(results, config.filters);
    }

    // Store total count before pagination
    const totalCount = results.length;

    // Apply sorting
    if (config.sort && config.sort.length > 0) {
      results = this.applySorting(results, config.sort);
    }

    // Apply pagination
    const offset = config.offset || 0;
    const limit = config.limit;
    
    if (limit) {
      results = results.slice(offset, offset + limit);
    }

    // Calculate facets for filter suggestions
    const facets = this.calculateFacets(data, config.filters || []);

    const executionTime = performance.now() - startTime;

    return {
      items: results,
      totalCount,
      hasMore: limit ? (offset + limit) < totalCount : false,
      executionTime,
      query: config,
      facets,
    };
  }

  private applyTextSearch<T extends Record<string, any>>(
    data: T[],
    query: string,
    searchableFields: string[],
    fuzzySearch?: boolean
  ): T[] {
    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return data;

    return data.filter(item => {
      return searchableFields.some(field => {
        const fieldValue = this.getNestedValue(item, field);
        if (fieldValue == null) return false;

        const stringValue = String(fieldValue).toLowerCase();

        if (fuzzySearch) {
          return this.fuzzyMatch(stringValue, queryLower);
        } else {
          return stringValue.includes(queryLower);
        }
      });
    });
  }

  private applyFilters<T extends Record<string, any>>(
    data: T[],
    filters: SearchFilter[]
  ): T[] {
    return data.filter(item => {
      return filters.every(filter => this.evaluateFilter(item, filter));
    });
  }

  private evaluateFilter<T extends Record<string, any>>(
    item: T,
    filter: SearchFilter
  ): boolean {
    const fieldValue = this.getNestedValue(item, filter.field);
    const { operator, value, value2 } = filter;

    switch (operator) {
      case 'equals':
        return fieldValue === value;

      case 'contains':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;

      case 'startsWith':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.toLowerCase().startsWith(value.toLowerCase());
        }
        return false;

      case 'endsWith':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.toLowerCase().endsWith(value.toLowerCase());
        }
        return false;

      case 'greaterThan':
        return Number(fieldValue) > Number(value);

      case 'lessThan':
        return Number(fieldValue) < Number(value);

      case 'between':
        const numValue = Number(fieldValue);
        return numValue >= Number(value) && numValue <= Number(value2);

      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);

      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);

      default:
        return true;
    }
  }

  private applySorting<T extends Record<string, any>>(
    data: T[],
    sortOptions: SortOption[]
  ): T[] {
    return [...data].sort((a, b) => {
      for (const sort of sortOptions) {
        const aValue = this.getNestedValue(a, sort.field);
        const bValue = this.getNestedValue(b, sort.field);

        let comparison = 0;

        if (aValue == null && bValue == null) {
          comparison = 0;
        } else if (aValue == null) {
          comparison = 1;
        } else if (bValue == null) {
          comparison = -1;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private calculateFacets<T extends Record<string, any>>(
    data: T[],
    appliedFilters: SearchFilter[]
  ): Record<string, { value: string; count: number }[]> {
    const facets: Record<string, { value: string; count: number }[]> = {};
    
    // Common fields to create facets for
    const facetFields = ['status', 'role', 'category', 'type', 'department', 'priority'];

    facetFields.forEach(field => {
      const counts = new Map<string, number>();
      
      data.forEach(item => {
        const value = this.getNestedValue(item, field);
        if (value != null) {
          const stringValue = String(value);
          counts.set(stringValue, (counts.get(stringValue) || 0) + 1);
        }
      });

      if (counts.size > 0) {
        facets[field] = Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      }
    });

    return facets;
  }

  private fuzzyMatch(text: string, query: string): boolean {
    // Simple fuzzy matching algorithm
    const textChars = text.split('');
    const queryChars = query.split('');
    
    let textIndex = 0;
    let queryIndex = 0;
    let score = 0;

    while (textIndex < textChars.length && queryIndex < queryChars.length) {
      if (textChars[textIndex] === queryChars[queryIndex]) {
        score++;
        queryIndex++;
      }
      textIndex++;
    }

    // Require at least 70% of query characters to match
    return score / queryChars.length >= 0.7;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Predefined search configurations for common use cases
  public createUserSearch(): SearchConfig {
    return {
      fuzzySearch: true,
      sort: [{ field: 'fullName', direction: 'asc' }],
      limit: 50,
    };
  }

  public createTenderSearch(): SearchConfig {
    return {
      fuzzySearch: true,
      sort: [
        { field: 'createdDate', direction: 'desc' },
        { field: 'title', direction: 'asc' }
      ],
      limit: 25,
    };
  }

  public createInventorySearch(): SearchConfig {
    return {
      fuzzySearch: true,
      sort: [{ field: 'description', direction: 'asc' }],
      limit: 100,
    };
  }

  // Quick search methods
  public searchUsers(users: any[], query: string, filters: SearchFilter[] = []): SearchResult<any> {
    const config: SearchConfig = {
      query,
      filters,
      ...this.createUserSearch(),
    };

    const searchableFields = ['username', 'fullName', 'email', 'role', 'officeName', 'wingName'];
    return this.search(users, config, searchableFields);
  }

  public searchTenders(tenders: any[], query: string, filters: SearchFilter[] = []): SearchResult<any> {
    const config: SearchConfig = {
      query,
      filters,
      ...this.createTenderSearch(),
    };

    const searchableFields = ['title', 'description', 'status', 'createdBy', 'department'];
    return this.search(tenders, config, searchableFields);
  }

  public searchInventory(inventory: any[], query: string, filters: SearchFilter[] = []): SearchResult<any> {
    const config: SearchConfig = {
      query,
      filters,
      ...this.createInventorySearch(),
    };

    const searchableFields = ['itemCode', 'description', 'category', 'manufacturer', 'specifications'];
    return this.search(inventory, config, searchableFields);
  }
}

// Export singleton instance
export const advancedSearchService = AdvancedSearchService.getInstance();