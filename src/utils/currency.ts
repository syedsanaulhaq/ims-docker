/**
 * Currency formatting utilities for the Inventory Management System
 * Default currency: PKR (Pakistani Rupee)
 */

export const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbols and formatting, then parse as number
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

// Default export for convenience
export default formatCurrency;
