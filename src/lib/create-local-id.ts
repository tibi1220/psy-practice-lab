export function createLocalId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 12);

  return `${timestamp}-${randomPart}`;
}
