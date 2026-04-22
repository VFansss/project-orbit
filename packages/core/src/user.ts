/**
 * TODO: Logic to validate the identity string.
 * Now it's even stricter: no spaces, no filesystem invalid chars, and no '@'.
 * We reserve '@' for future remote/gateway login implementations.
 */
export function validateIdentity(id: string): boolean {
  const invalidChars = /[\\/:*?"<>| @]/;
  return id.length > 0 && !invalidChars.test(id);
}
