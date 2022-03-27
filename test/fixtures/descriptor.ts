/**
 * Used to test CMPMananger's import function for TypeScript files.
 */

import { SimpleCMPDescriptor, CMPDescriptor } from '../../src/descriptors';

export default function buildDescriptor(): CMPDescriptor {
  return new SimpleCMPDescriptor('descriptor.ts', { cookies: ['aCookieName'] }, [''], ['']);
}