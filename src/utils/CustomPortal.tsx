import React from 'react';
import {Fragment, createContext, useContext, useState} from 'react';

interface Portal {
  element: (close: () => void) => JSX.Element;
}

interface Value {
  createPortal: (
    element: (close: () => void) => JSX.Element,
    id: string,
  ) => void;
  closePortalById: (id: string) => void;
  getPortalById: (id: string) => Portal;
}

const CustomPortalContext = createContext<Value | undefined>(undefined);

interface CustomPortalProps {
  children: JSX.Element;
}

export function CustomPortalProvider(props: CustomPortalProps) {
  const [elements, setElements] = useState<Record<string, Portal>>({});

  const createPortal = (
    element: (close: () => void) => JSX.Element,
    id: string,
  ) => {
    if (getPortalById(id)) {
      return;
    }
    setElements(prevElements => ({...prevElements, [id]: {element}}));
  };

  const closePortalById = (id: string) => {
    const newElements = {...elements};
    delete newElements[id];
    setElements(newElements);
  };

  const getPortalById = (id: string) => elements[id];

  const value = {
    createPortal,
    closePortalById,
    getPortalById,
  };

  return (
    <CustomPortalContext.Provider value={value}>
      {props.children}
      {Object.keys(elements).map(id => (
        <Fragment key={id}>
          {elements[id].element(() => closePortalById(id))}
        </Fragment>
      ))}
    </CustomPortalContext.Provider>
  );
}

export function useCustomPortal() {
  return useContext(CustomPortalContext) as Value;
}
