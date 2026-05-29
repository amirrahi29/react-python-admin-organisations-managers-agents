function pickChar(chars: string) {
  const index = crypto.getRandomValues(new Uint32Array(1))[0]! % chars.length;
  return chars[index]!;
}

function shuffle(values: string[]) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result.join("");
}

export function generateSecurePassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%&*!";
  const all = upper + lower + digits + special;

  const required = [pickChar(upper), pickChar(lower), pickChar(digits), pickChar(special)];
  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () => pickChar(all));

  return shuffle([...required, ...rest]);
}
