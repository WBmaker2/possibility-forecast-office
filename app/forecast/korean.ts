export function withSubjectParticle(label: string): string {
  const lastCharacter = label.at(-1);
  if (!lastCharacter) return label;

  const code = lastCharacter.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (code - 0xac00) % 28 !== 0;

  return `${label}${hasFinalConsonant ? "이" : "가"}`;
}
