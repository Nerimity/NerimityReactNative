import {useState, useEffect} from 'react';
export default function useAwait<T>(promise: Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let ignore = false;
    if (data) {
      return () => {
        ignore = true;
      };
    }
    promise.then(json => {
      if (!ignore) {
        setData(json);
      }
    });
    return () => {
      ignore = true;
    };
  }, [promise, data]);
  return data;
}
