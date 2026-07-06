const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short codes for NFC stamps (4 chars, e.g. WS01) */
export function generateChipCode(length = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueChipCode(
  exists: (code: string) => Promise<boolean>,
  length = 4,
  maxAttempts = 20,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateChipCode(length);
    if (!(await exists(code))) return code;
  }
  return generateChipCode(6);
}
