/**
 * TODO: Logic to validate the identity string.
 * Now it's stricter to ensure the ID can be used as a folder name.
 */
export function validateIdentity(id: string): boolean {
  // Blocks spaces and invalid filesystem characters: \ / : * ? " < > |
  const invalidChars = /[\\/:*?"<>| ]/;
  return id.length > 0 && !invalidChars.test(id);
}
