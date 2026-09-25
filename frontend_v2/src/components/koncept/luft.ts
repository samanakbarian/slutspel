/**
 * Smala mellanrum runt streck och plus mellan två tal.
 *
 * Anybody i smalt snitt ritar tankstrecket nästan kant i kant med siffrorna,
 * så "3–4" blir en klump i stor storlek. Ett hårfint mellanrum på var sida
 * skiljer dem åt utan att raden blir bredare än den behöver.
 */
export const luft = (s: string) =>
  s.replace(/(\d)\s*[–-]\s*(\d)/g, '$1\u200a–\u200a$2').replace(/(\d)\s*\+\s*(\d)/g, '$1\u200a+\u200a$2');
