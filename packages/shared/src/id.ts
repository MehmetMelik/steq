let counter = 0;

export function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  counter = (counter + 1) % 1000;
  return `${timestamp.toString(36)}-${random}-${counter.toString(36).padStart(3, '0')}`;
}
