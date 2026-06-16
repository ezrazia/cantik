/**
 * Safe JSON parse utility with fallback
 * Prevents crashes when parsing invalid JSON strings
 *
 * @param {string|null|undefined} str - JSON string to parse
 * @param {any} fallback - Value to return if parsing fails
 * @param {boolean} returnStringIfInvalid - If true, returns the original string if parsing fails
 * @returns {any} Parsed object or fallback value
 */
export function safeJsonParse(str, fallback = null, returnStringIfInvalid = false) {
  // Handle null, undefined, or empty values
  if (str === null || str === undefined || str === '') {
    return fallback;
  }

  // Handle special string values that are not valid JSON
  const strVal = String(str).trim().toLowerCase();
  if (strVal === 'null' || strVal === 'undefined' || strVal === 'nan') {
    return fallback;
  }

  // If it's already an object (parsed), return it
  if (typeof str === 'object') {
    return str;
  }

  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch (error) {
    console.warn('safeJsonParse: Failed to parse JSON', { input: str, error: error.message });
    if (returnStringIfInvalid) {
      return str;
    }
    return fallback;
  }
}

/**
 * Safe JSON stringify with circular reference handling
 *
 * @param {any} obj - Object to stringify
 * @param {any} fallback - Value to return if stringify fails
 * @param {number} [indent] - Indentation for pretty print
 * @returns {string} JSON string or fallback
 */
export function safeJsonStringify(obj, fallback = null, indent = undefined) {
  if (obj === undefined) {
    return fallback;
  }

  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    console.warn('safeJsonStringify: Failed to stringify', { error: error.message });
    return fallback;
  }
}

/**
 * Safe localStorage get with automatic JSON parsing
 *
 * @param {string} key - Storage key
 * @param {any} fallback - Value to return if not found or invalid
 * @returns {any} Stored value or fallback
 */
export function safeStorageGet(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`safeStorageGet: Failed to get/parse "${key}"`, { error: error.message });
    // Try to remove corrupted item
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
    return fallback;
  }
}

/**
 * Safe localStorage set with JSON serialization
 *
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} True if successful
 */
export function safeStorageSet(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`safeStorageSet: Failed to store "${key}"`, { error: error.message });
    return false;
  }
}

/**
 * Safe localStorage remove
 *
 * @param {string} key - Storage key to remove
 * @returns {boolean} True if successful
 */
export function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe integer parsing with bounds checking
 *
 * @param {string|number} value - Value to parse
 * @param {number} fallback - Default value if parsing fails
 * @param {number} [min] - Minimum allowed value
 * @param {number} [max] - Maximum allowed value
 * @returns {number} Parsed and bounded integer
 */
export function safeParseInt(value, fallback = 0, min = undefined, max = undefined) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed)) {
    return fallback;
  }

  let result = parsed;

  if (min !== undefined && result < min) {
    result = min;
  }

  if (max !== undefined && result > max) {
    result = max;
  }

  return result;
}
