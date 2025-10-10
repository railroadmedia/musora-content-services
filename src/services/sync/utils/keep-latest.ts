// A function that queues up functions that return promises
// that drops all concurrent attempts but keeps the last one
// and runs it after the first one has completed
// Also accepts args to pass to the function, before a state arg
// that indicates whether the function is a "latest" one
// which is useful for "breaking" parallel throttling behaviour

export default function keepLatest<T, TArgs extends any[]>(fn: (state: { isLatest: boolean }, ...args: TArgs) => Promise<T>, ...args: TArgs) {
  let active: Promise<T> | null = null;
  let next: (() => Promise<T>) | null = null;

  return () => {
    return new Promise<T>((resolve, reject) => {
      const runner = (state: { isLatest: boolean }): Promise<T> => {
        const p = fn(state, ...args);
        p.then(resolve, reject);
        return p;
      };

      const onSettled = () => {
        active = null;
        if (next) {
          const n = next;
          next = null;
          active = n().finally(onSettled);
        }
      };

      if (!active) {
        active = runner({ isLatest: false }).finally(onSettled);
      } else {
        next = () => runner({ isLatest: true });
      }
    });
  };
}
