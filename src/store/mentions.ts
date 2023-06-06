import {makeAutoObservable} from 'mobx';
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

  set(channelId: string, mention: Mention) {
    this.cache[channelId] = mention;
  }
  get get() {
    return (channelId: string) => this.cache[channelId] as Mention | undefined;
  }
}
