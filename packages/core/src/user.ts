/**
 * TODO: Logic to validate the identity string.
 * Keeps the core logic separated from the CLI.
 */
export function validateIdentity(id: string): boolean {
  return id.length > 0 && !id.includes(' ');
}
