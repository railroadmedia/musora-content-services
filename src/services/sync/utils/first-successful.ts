/**
 * Returns a promise that resolves with the value of the first successfully resolved promise
 * from the input array. If all promises reject, it rejects with an array of all rejection reasons.
 *
 * @param promises An array of promises to race
 */
export default function firstSuccessful<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejections: any[] = [];
    let pending = promises.length;

    promises.forEach(p =>
      p.then(resolve)
       .catch(err => {
         rejections.push(err);
         pending--;
         if (pending === 0) {
           reject(rejections);
         }
       })
    );
  });
}
