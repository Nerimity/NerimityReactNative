import {makeAutoObservable, runInAction} from 'mobx';
import {RawMessage} from './RawData';
import {Store} from './store';
import {fetchMessages, postMessage} from '../services/MessageService';

export class Messages {
  cache: Record<string, RawMessage[]> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }

  addMessage(channelId: string, message: RawMessage) {
    this.store.messages.cache[channelId]?.unshift?.(message);
  }

  async fetchAndCacheMessages(channelId: string, force = false) {
    if (this.cache[channelId] && !force) {
      return;
    }
    const messages = await fetchMessages(channelId);
    runInAction(() => (this.cache[channelId] = messages.reverse()));
  }

  async postMessage(channelId: string, content: string) {
    const message = await postMessage({
      channelId,
      content,
      socketId: this.store.socket.io.id,
    });
    // runInAction(() => (this.cache[channelId] = messages.reverse()));
    this.addMessage(channelId, message);
  }

  get channelMessages() {
    return (channelId: string) =>
      this.cache[channelId] as RawMessage[] | undefined;
  }
}
