import { Fragment, createContext, useContext, useState } from "react";
import { View } from "react-native";

interface Value {
  createPortal: (element: (close: () => void) => JSX.Element, id?: string) => number | undefined
  closePortal: (index: number) => void,
  closePortalById: (id: string) => void,
  isPortalOpened: (id: string) => boolean,
}

const CustomPortalContext = createContext<Value | undefined>(undefined);

interface CustomPortalProps {
  children: JSX.Element
}

export function CustomPortalProvider(props: CustomPortalProps) {

  const [elements, setElements] = useState<{element: ((close: () => void) => JSX.Element), id?: string}[]>([]);

  
  const createPortal = (element: (close: () => void) => JSX.Element, id?: string) => {
    if (id && isPortalOpened(id)) return;
    setElements([...elements, {element, id}])
    return elements.length - 1;
  }
 
  const closePortal = (index: number) => {
    setElements(elements.filter((_, i) => i!== index));
  }

  const closePortalById = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
  }

  const isPortalOpened = (id: string) => elements.find(e => e.id === id) !== undefined;

  const value = {
    createPortal,
    closePortal,
    closePortalById,
    isPortalOpened
  }
  

  return (
    <CustomPortalContext.Provider value={value}>
      {props.children}
      {elements.map((item, index) => (
        <Fragment key={item.id || index}>
            {item.element(() => closePortal(index))}
        </Fragment>
      ))}
    </CustomPortalContext.Provider>
  );
}

export function useCustomPortal() { return useContext(CustomPortalContext) as Value; }