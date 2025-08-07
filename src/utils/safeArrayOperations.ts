/**
 * Safe Array Operations to Prevent Stack Overflow
 * Provides protected versions of common array methods
 */

import { hasCircularReference } from './circularReferenceDetector';

/**
 * Safe map operation with circular reference and depth protection
 */
export function safeMap<T, R>(
  array: T[], 
  callback: (item: T, index: number, array: T[]) => R,
  options: {
    maxDepth?: number;
    maxLength?: number;
    onError?: (error: Error, index: number) => R;
  } = {}
): R[] {
  const { 
    maxDepth = 1000, 
    maxLength = 10000,
    onError = () => null as any
  } = options;
  
  // Validate input
  if (!Array.isArray(array)) {
    console.warn('safeMap: Input is not an array');
    return [];
  }
  
  if (array.length > maxLength) {
    console.warn(`safeMap: Array too large (${array.length} > ${maxLength}), truncating`);
    array = array.slice(0, maxLength);
  }
  
  // Check for circular references in array
  if (hasCircularReference(array)) {
    console.error('safeMap: Circular reference detected in array');
    return [];
  }
  
  const result: R[] = [];
  const seen = new WeakSet();
  
  for (let i = 0; i < array.length && i < maxDepth; i++) {
    const item = array[i];
    
    // Check for circular references in individual items
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        console.warn(`safeMap: Circular reference at index ${i}`);
        result.push(onError(new Error('Circular reference'), i));
        continue;
      }
      seen.add(item);
    }
    
    try {
      result.push(callback(item, i, array));
    } catch (error) {
      console.error(`safeMap: Error at index ${i}:`, error);
      result.push(onError(error as Error, i));
    }
  }
  
  return result;
}

/**
 * Safe filter operation
 */
export function safeFilter<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean,
  maxLength: number = 10000
): T[] {
  if (!Array.isArray(array)) {
    console.warn('safeFilter: Input is not an array');
    return [];
  }
  
  if (array.length > maxLength) {
    console.warn(`safeFilter: Array too large, truncating to ${maxLength}`);
    array = array.slice(0, maxLength);
  }
  
  const result: T[] = [];
  const seen = new WeakSet();
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        console.warn(`safeFilter: Skipping circular reference at index ${i}`);
        continue;
      }
      seen.add(item);
    }
    
    try {
      if (predicate(item, i, array)) {
        result.push(item);
      }
    } catch (error) {
      console.error(`safeFilter: Error at index ${i}:`, error);
    }
  }
  
  return result;
}

/**
 * Safe reduce operation
 */
export function safeReduce<T, R>(
  array: T[],
  callback: (accumulator: R, current: T, index: number, array: T[]) => R,
  initialValue: R,
  maxLength: number = 10000
): R {
  if (!Array.isArray(array)) {
    console.warn('safeReduce: Input is not an array');
    return initialValue;
  }
  
  if (array.length > maxLength) {
    console.warn(`safeReduce: Array too large, truncating to ${maxLength}`);
    array = array.slice(0, maxLength);
  }
  
  let accumulator = initialValue;
  const seen = new WeakSet();
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        console.warn(`safeReduce: Skipping circular reference at index ${i}`);
        continue;
      }
      seen.add(item);
    }
    
    try {
      accumulator = callback(accumulator, item, i, array);
      
      // Check if accumulator has become circular
      if (typeof accumulator === 'object' && accumulator !== null) {
        if (hasCircularReference(accumulator)) {
          console.error('safeReduce: Circular reference detected in accumulator');
          break;
        }
      }
    } catch (error) {
      console.error(`safeReduce: Error at index ${i}:`, error);
      break;
    }
  }
  
  return accumulator;
}

/**
 * Safe forEach operation
 */
export function safeForEach<T>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => void,
  maxLength: number = 10000
): void {
  if (!Array.isArray(array)) {
    console.warn('safeForEach: Input is not an array');
    return;
  }
  
  if (array.length > maxLength) {
    console.warn(`safeForEach: Array too large, truncating to ${maxLength}`);
    array = array.slice(0, maxLength);
  }
  
  const seen = new WeakSet();
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        console.warn(`safeForEach: Skipping circular reference at index ${i}`);
        continue;
      }
      seen.add(item);
    }
    
    try {
      callback(item, i, array);
    } catch (error) {
      console.error(`safeForEach: Error at index ${i}:`, error);
    }
  }
}

/**
 * Safe find operation
 */
export function safeFind<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean,
  maxLength: number = 10000
): T | undefined {
  if (!Array.isArray(array)) {
    console.warn('safeFind: Input is not an array');
    return undefined;
  }
  
  if (array.length > maxLength) {
    console.warn(`safeFind: Array too large, limiting search to ${maxLength}`);
    array = array.slice(0, maxLength);
  }
  
  const seen = new WeakSet();
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        console.warn(`safeFind: Skipping circular reference at index ${i}`);
        continue;
      }
      seen.add(item);
    }
    
    try {
      if (predicate(item, i, array)) {
        return item;
      }
    } catch (error) {
      console.error(`safeFind: Error at index ${i}:`, error);
    }
  }
  
  return undefined;
}

/**
 * Safe array flattening with depth control
 */
export function safeFlatten<T>(
  array: any[],
  maxDepth: number = 1,
  currentDepth: number = 0
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  
  if (currentDepth >= maxDepth) {
    return array as T[];
  }
  
  const result: T[] = [];
  const seen = new WeakSet();
  
  for (const item of array) {
    if (Array.isArray(item)) {
      if (seen.has(item)) {
        console.warn('safeFlatten: Circular reference detected');
        continue;
      }
      seen.add(item);
      result.push(...safeFlatten<T>(item, maxDepth, currentDepth + 1));
    } else {
      result.push(item);
    }
  }
  
  return result;
}