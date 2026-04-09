export function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isValidPhone(value: string): boolean {
  const normalized = value.replace(/\s+/g, "").trim();
  if (!normalized) return true;
  return /^\+?[0-9]{9,15}$/.test(normalized);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 6;
}

export function requiredMessage(value: string, label: string): string | null {
  if (!value.trim()) {
    return `${label} là bắt buộc.`;
  }
  return null;
}