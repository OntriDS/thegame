/** Defense 3 — private vault uploads */
export const PRIVATE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export function isReasonablePrivateContentType(ct: string): boolean {
  const s = ct.trim();
  return s.length > 0 && s.length <= 200 && !/[\r\n<>]/.test(s);
}
