import { createContext, JSX, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  setSocket: (socket: Socket) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider = (props: { children: JSX.Element }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  const value = {
    setSocket,
    socket,
  } as SocketContextValue;

  return (
    <SocketContext.Provider value={value}>
      {props.children}
    </SocketContext.Provider>
  );
};
export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return socket;
};

export const useSocketListener = (
  event: string,
  callback: (data: any) => void,
) => {
  const { socket } = useSocket();

  useEffect(() => {
    const socketCopy = socket;
    const callbackCopy = callback;
    socketCopy?.on(event, callbackCopy);
    return () => {
      socketCopy?.off(event, callbackCopy);
    };
  }, [event, callback, socket]);
};
