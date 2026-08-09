/**
 * Date utility functions for consistent formatting across the application
 */

/**
 * Formats a date string or Date object to dd/mm/yyyy format
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted date string in dd/mm/yyyy format or 'Invalid Date' if input is invalid
 */
export const formatDateDMY = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'Invalid Date';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Invalid Date';
    
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
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
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
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Invalid Date';
    
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
