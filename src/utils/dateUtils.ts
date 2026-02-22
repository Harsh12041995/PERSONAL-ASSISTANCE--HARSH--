import { format, formatDistanceToNow } from "date-fns";

/**
 * Safely formats a date string or Date object
 * @param date - The date to format (string, Date, or null/undefined)
 * @param formatString - The format string for date-fns
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export const safeFormatDate = (
  date: string | Date | null | undefined,
  formatString: string,
  fallback: string = "No date available"
): string => {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return fallback;
  }
};

/**
 * Safely formats a date distance (e.g., "2 days ago")
 * @param date - The date to format (string, Date, or null/undefined)
 * @param options - Options for formatDistanceToNow
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted distance string or fallback
 */
export const safeFormatDistance = (
  date: string | Date | null | undefined,
  options?: { addSuffix?: boolean },
  fallback: string = "N/A"
): string => {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    return formatDistanceToNow(dateObj, options);
  } catch (error) {
    console.warn('Error formatting date distance:', error);
    return fallback;
  }
};

/**
 * Safely creates a Date object
 * @param date - The date input (string, Date, or null/undefined)
 * @returns Date object or null if invalid
 */
export const safeCreateDate = (
  date: string | Date | null | undefined
): Date | null => {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    return dateObj;
  } catch (error) {
    console.warn('Error creating date object:', error);
    return null;
  }
}; 