/**
 * Språkhjälpare.
 *
 * Sajten skriver "{n} matcher" på ett tjugotal ställen. Det märks inte under en
 * spelad säsong, men den 19 september står det "1 matcher" överallt — på
 * spelarprofiler, i målvaktskort, i matchrapportens fotnot. Räkneordet ska böja
 * substantivet.
 */

/** "1 match", "2 matcher". */
export const matcher = (n: number) => (n === 1 ? '1 match' : `${n} matcher`);

/** "1 mål", "2 mål" — oräknebart i plural, men tar ändå hand om noll. */
export const mal = (n: number) => `${n} mål`;
