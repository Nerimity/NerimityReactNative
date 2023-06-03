import React from 'react';
import {Socket} from './Socket';
import {Servers} from './servers';
import {Channels} from './channels';
import {Messages} from './messages';

export class Store {
  socket: Socket;
  servers: Servers;
  channels: Channels;
  messages: Messages;
  constructor() {
    this.messages = new Messages(this);
    this.channels = new Channels(this);
    this.servers = new Servers(this);
    this.socket = new Socket(this);
  }
}

const StoreContext = React.createContext<Store>({} as Store);

export const StoreProvider = ({children}: {children: React.ReactElement}) => {
  const store = new Store();
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => React.useContext(StoreContext);
