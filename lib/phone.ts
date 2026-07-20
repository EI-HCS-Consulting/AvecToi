// Normalise un numéro de téléphone saisi ("06 12 34 56 78", "06.12.34.56.78"…)
// en une suite de chiffres, pour que le matching entre espaces (voir
// components/IntervenantFicheModal.tsx et app/(visitor)/account.tsx "Mes
// espaces") soit insensible au formatage.
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}
