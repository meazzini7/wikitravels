// Chiavi di abbinamento in minuscolo per una meta (nome + codice paese).
// Usate sia per salvare dreamDestinationKeys sul profilo utente, sia per
// controllare se un viaggio o un articolo pubblicato corrisponde a una
// meta dei sogni salvata da qualcuno (query Firestore "array-contains-any").
export function destinationMatchKeys(name: string, countryCode?: string | null): string[] {
  const keys = new Set<string>();
  const primary = name.split(",")[0]?.trim().toLowerCase();
  if (primary) keys.add(primary);
  if (countryCode) keys.add(countryCode.trim().toLowerCase());
  return Array.from(keys);
}
