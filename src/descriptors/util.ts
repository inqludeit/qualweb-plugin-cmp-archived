/**
 * Helper function. Takes as input either a single object of type T or an array
 * of objects of type T and returns an array. If an array is input, the output
 * will be the same array. If a single object is input, a single-element array
 * of that object is output.
 * This function serves as an easy wrapper for types that are "either T or an
 * array of type T", when you need to co-erce it into array form.
 * @param obj Object to convert.
 * @returns 
 */
 export function toArray<T>(obj: T | T[]): T[] {
  return Array.isArray(obj) ? obj : [obj];
}