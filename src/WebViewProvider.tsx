import { createContext, JSX, useContext, useState } from 'react';

interface WebViewContextValue {
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
}

const WebViewContext = createContext<WebViewContextValue | null>(null);

export const WebViewProvider = (props: { children: JSX.Element }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const value = {
    currentUrl,
    setCurrentUrl,
  } as WebViewContextValue;

  return (
    <WebViewContext.Provider value={value}>
      {props.children}
    </WebViewContext.Provider>
  );
};
export const useWebView = () => {
  const webview = useContext(WebViewContext);
  if (!webview) {
    throw new Error('useWebView must be used within a SocketProvider');
  }
  return webview;
};
