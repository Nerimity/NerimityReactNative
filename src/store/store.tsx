import React from 'react';
import {Socket} from './Socket';
import {Servers} from './servers';
import {Channels} from './channels';
import {Messages} from './messages';
import {Account} from './account';
import {Mentions} from './mentions';
import {Users} from './users';
import {ServerMembers} from './serverMembers';
import {ServerRoles} from './serverRoles';

export class Store {
  socket: Socket;
  servers: Servers;
  channels: Channels;
  messages: Messages;
  account: Account;
  mentions: Mentions;
  users: Users;
  serverMembers: ServerMembers;
  serverRoles: ServerRoles;
  constructor() {
    this.account = new Account(this);
    this.users = new Users(this);
    this.serverRoles = new ServerRoles(this);
    this.serverMembers = new ServerMembers(this);
    this.messages = new Messages(this);
    this.channels = new Channels(this);
    this.servers = new Servers(this);
    this.mentions = new Mentions(this);
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
