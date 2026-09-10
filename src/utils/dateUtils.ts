/**
 * Date utility functions for consistent formatting across the application
 */

/**
 * Parses a date input, handling SQL Server datetime2 local timestamps that may contain trailing 'Z'
 */
export const parseSqlDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'string') {
    // If the date string has a trailing 'Z' but represents a local SQL Server timestamp (stored via GETDATE()):
    // Strip the 'Z' so it is parsed as local time without shifting timezones
    const cleanStr = dateInput.endsWith('Z') ? dateInput.slice(0, -1) : dateInput;
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) return parsed;
    const raw = new Date(dateInput);
    return isNaN(raw.getTime()) ? null : raw;
  }
  return null;
};

/**
 * Formats a date string or Date object to dd/mm/yyyy format
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted date string in dd/mm/yyyy format or 'Invalid Date' if input is invalid
 */
export const formatDateDMY = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'Invalid Date';
  
  try {
    const date = parseSqlDate(dateInput);
    if (!date) return 'Invalid Date';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Formats a date to YYYY-MM-DD format for HTML date inputs
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted date string in YYYY-MM-DD format or empty string if invalid
 */
export const formatDateForInput = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  
  try {
    const date = parseSqlDate(dateInput);
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
};

/**
 * Gets current date in YYYY-MM-DD format for HTML date inputs
 * @returns Current date in YYYY-MM-DD format
 */
export const getCurrentDateForInput = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Gets current date in dd/mm/yyyy format
 * @returns Current date in dd/mm/yyyy format
 */
export const getCurrentDateDMY = (): string => {
  return formatDateDMY(new Date());
};

/**
 * Formats a date string or Date object to dd/mm/yyyy HH:mm format (with time)
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted date string in dd/mm/yyyy HH:mm format or 'Invalid Date' if input is invalid
 */
export const formatDateTimeDMY = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'Invalid Date';
  
  try {
    const date = parseSqlDate(dateInput);
    if (!date) return 'Invalid Date';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Formats a date string or Date object for standard display: e.g. "Sep 8, 2026, 10:54 AM"
 */
export const formatDisplayDateTime = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'N/A';
  const date = parseSqlDate(dateInput);
  if (!date) return 'N/A';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

