/**
 * Date utilities for handling UTC timestamps from the backend.
 *
 * The backend stores all timestamps in UTC without timezone indicators.
 * These utilities ensure dates are properly interpreted as UTC and
 * displayed in the user's local timezone.
 */

/**
 * Parse a date string from the backend as UTC.
 * Handles ISO 8601 strings with or without timezone indicators.
 *
 * @param dateStr - Date string from backend (e.g., "2026-01-09T12:03:36.288768")
 * @returns Date object in local timezone
 */
export function parseUTCDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  // If the string already has a timezone indicator, parse as-is
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Otherwise, append 'Z' to interpret as UTC
  return new Date(dateStr + 'Z');
}

/**
 * Format a UTC date string to a localized date/time string.
 *
 * @param dateStr - Date string from backend
 * @param options - Intl.DateTimeFormat options (defaults to showing date and time)
 * @returns Formatted date string in user's locale and timezone
 */
export function formatDate(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseUTCDate(dateStr);
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return date.toLocaleString(undefined, options ?? defaultOptions);
}

/**
 * Format a UTC date string to a localized date-only string.
 *
 * @param dateStr - Date string from backend
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in user's locale and timezone
 */
export function formatDateOnly(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseUTCDate(dateStr);
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString(undefined, options ?? defaultOptions);
}
