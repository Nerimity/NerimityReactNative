import {makeAutoObservable, remove as removeItem} from 'mobx';
import {Store} from './store';

export type Mention = {
  channelId: string;
  userId: string;
  count: number;
  serverId?: string;
};

export class Mentions {
  cache: Record<string, Mention> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }

  set(channelId: string, mention: Mention) {
    this.cache[channelId] = mention;
  }
  remove(channelId: string) {
    removeItem(this.cache, channelId);
  }
  get get() {
    return (channelId: string) => this.cache[channelId] as Mention | undefined;
  }
}
