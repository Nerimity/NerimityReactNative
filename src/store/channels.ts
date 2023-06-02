import {makeAutoObservable} from 'mobx';
import {RawChannel} from './RawData';
import {Store} from './store';

export class Channels {
  cache: Record<string, Channel> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addCache(rawChannel: RawChannel) {
    const channel = new Channel(rawChannel);
    this.cache[channel.id] = channel;
  }
  get array() {
    return Object.values(this.cache);
  }
}

export class Channel {
  id: string;
  name?: string;
  serverId?: string;
  constructor(channel: RawChannel) {
    makeAutoObservable(this, {id: false, serverId: false});
    this.id = channel.id;
    this.serverId = channel.serverId;
    this.name = channel.name;
  }
}
