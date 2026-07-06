import * as Crypto from "expo-crypto";

// Code dossier : identifiant court a saisir/dicter a la main (par opposition
// a l'invite_token, un UUID reserve aux liens/QR). Charset volontairement
// restreint aux caracteres non ambigus a l'oral/a l'ecrit (exclut 0/O, 1/I/L).
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 7;

export function generateDossierCode(): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

export function normalizeDossierCode(input: string): string {
  return input.trim().toUpperCase();
}
