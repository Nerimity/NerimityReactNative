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
import {Friends} from './friends';
import {Inbox} from './inbox';
import {transaction} from 'mobx';
import EncryptedStorage from 'react-native-encrypted-storage';
import messaging from '@react-native-firebase/messaging';
import { ChannelProperties } from './channelProperties';
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
  friends: Friends;
  inbox: Inbox;
  channelProperties: ChannelProperties;
  constructor() {
    this.account = new Account(this);
    this.users = new Users(this);
    this.serverRoles = new ServerRoles(this);
    this.serverMembers = new ServerMembers(this);
    this.messages = new Messages(this);
    this.channels = new Channels(this);
    this.servers = new Servers(this);
    this.mentions = new Mentions(this);
    this.friends = new Friends(this);
    this.inbox = new Inbox(this);
    this.socket = new Socket(this);
    this.channelProperties = new ChannelProperties(this);
  }
  async logout() {
    this.socket.io.disconnect();
    await EncryptedStorage.clear();
    await messaging().unregisterDeviceForRemoteMessages();
    transaction(() => {
      this.account.reset();
      this.users.reset();
      this.serverRoles.reset();
      this.serverMembers.reset();
      this.messages.reset();
      this.channels.reset();
      this.servers.reset();
      this.mentions.reset();
      this.friends.reset();
      this.inbox.reset();
      this.channelProperties.reset();
    });
  }
}

const StoreContext = React.createContext<Store>({} as Store);
export const store = new Store();

export const StoreProvider = ({children}: {children: React.ReactElement}) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => React.useContext(StoreContext);
