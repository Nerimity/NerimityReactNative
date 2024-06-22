import {useEffect, useState} from 'react';

export type UseUpdateSignal<T> = [
  T,
  () => Partial<T>,
  <K extends keyof T>(key: keyof T, value: T[K]) => void,
];

export function useUpdatedSignal<T>(defaultValues: T): UseUpdateSignal<T> {
  // defaultValues will be an object

  const [values, setValues] = useState<T>({...defaultValues} as any);

  useEffect(() => {
    setValues({...defaultValues});
  }, [defaultValues]);

  // params of key and value
  const updateValue = <K extends keyof T>(key: keyof T, value: T[K]) => {
    setValues(prev => ({...prev, [key]: value}));
  };

  const updatedValues = () => {
    const updatedValuesObj: Partial<T> = {};
    for (const key in values) {
      const defaultValue = defaultValues[key];
      const updatedValue = values[key];
      if (defaultValue !== updatedValue) {
        updatedValuesObj[key] = updatedValue;
      }
    }
    return updatedValuesObj;
  };
  return [values, updatedValues, updateValue];
}
