export function maskDocumentNumber(documentNumber: string): string {
  const clean = documentNumber.replace(/\s+/g, '');

  if (clean.length <= 4) {
    return clean;
  }

  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

