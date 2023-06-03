import {makeAutoObservable} from 'mobx';
import {RawMessage} from './RawData';
import {Store} from './store';

export class Messages {
  cache: Record<string, RawMessage[]> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addMessages(channelId: string, messages: RawMessage[]) {
    this.cache[channelId] = messages;
  }
}
