/**
 * Circular Reference Detection and Prevention Utilities
 * Prevents stack overflow errors from circular object references
 */

/**
 * Check if an object contains circular references
 */
export function hasCircularReference(obj: any): boolean {
  const seen = new WeakSet();
  
  function detect(current: any, depth: number = 0): boolean {
    // Prevent deep recursion
    if (depth > 100) {
      console.warn('Deep object detected, stopping at depth 100');
      return false;
    }
    
    if (current && typeof current === 'object') {
      if (seen.has(current)) {
        return true; // Circular reference found
      }
      seen.add(current);
      
      try {
        // Check arrays
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            if (detect(current[i], depth + 1)) return true;
          }
        } else {
          // Check object properties
          for (const key in current) {
            if (current.hasOwnProperty(key)) {
              if (detect(current[key], depth + 1)) return true;
            }
          }
        }
      } catch (error) {
        // Silently handle any errors (e.g., getter errors)
        return false;
      }
    }
    return false;
  }
  
  try {
    return detect(obj);
  } catch (error) {
    console.error('Error detecting circular reference:', error);
    return false;
  }
}

/**
 * Remove circular references from an object
 */
export function removeCircularReferences(obj: any): any {
  try {
    const seen = new WeakSet();
    
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference Removed]';
        }
        seen.add(value);
      }
      return value;
    }));
  } catch (error) {
    console.error('Error removing circular references:', error);
    return null;
  }
}

/**
 * Safely stringify an object, handling circular references
 */
export function safeStringify(obj: any, space?: number): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, space);
  } catch (error) {
    return '{"error": "Failed to stringify object"}';
  }
}

/**
 * Create a deep clone of an object without circular references
 */
export function safeClone<T>(obj: T): T {
  try {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Handle special cases
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => safeClone(item)) as any;
    }
    
    // Regular object - use JSON parse/stringify to break circular refs
    return removeCircularReferences(obj);
  } catch (error) {
    console.error('Error cloning object:', error);
    return {} as T;
  }
}

/**
 * Check if an object is safe to process (no circular refs, reasonable size)
 */
export function isSafeObject(obj: any, maxDepth: number = 50): boolean {
  if (obj === null || typeof obj !== 'object') {
    return true;
  }
  
  // Quick size check
  try {
    const jsonStr = JSON.stringify(obj);
    if (jsonStr.length > 1000000) { // 1MB limit
      console.warn('Object too large for safe processing');
      return false;
    }
  } catch (error) {
    // Likely has circular references
    return false;
  }
  
  return !hasCircularReference(obj);
}