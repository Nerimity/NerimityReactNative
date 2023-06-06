import {makeAutoObservable} from 'mobx';
import {RawServer} from './RawData';
import {Store} from './store';

export class Servers {
  cache: Record<string, Server> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addCache(rawServer: RawServer) {
    const server = new Server(this.store, rawServer);
    this.cache[server.id] = server;
  }
  get array() {
    return Object.values(this.cache);
  }
}

export class Server {
  id: string;
  name: string;
  avatar?: string;
  hexColor: string;
  createdById: string;
  defaultRoleId: string;
  store: Store;
  constructor(store: Store, server: RawServer) {
    makeAutoObservable(this, {id: false, store: false});
    this.store = store;
    this.id = server.id;
    this.name = server.name;
    this.avatar = server.avatar;
    this.hexColor = server.hexColor;
    this.createdById = server.createdById;
    this.defaultRoleId = server.defaultRoleId;
  }

  get hasNotifications() {
    return this.store.channels
      .getChannelsByServerId(this.id)
      .find(channel => channel.hasNotifications);
  }

  get avatarUrl() {
    return `https://cdn.nerimity.com/${this.avatar}`;
  }
  get channels() {
    return this.store.channels.array.filter(
      channel => channel.serverId === this.id,
    );
  }
}
