export function initialiseApp<T>(
  target: T | null,
  mountApplication: (target: T) => void,
): void {
  if (!target) {
    throw new Error('App target element was not found');
  }

  mountApplication(target);
}
