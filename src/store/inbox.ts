import {makeAutoObservable, transaction} from 'mobx';
import {RawInboxWithoutChannel} from './RawData';
import {Store} from './store';

export class Inbox {
  cache: Record<string, InboxItem> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }
  addCache(rawInbox: RawInboxWithoutChannel) {
    const inbox = new InboxItem(this.store, rawInbox);
    this.cache[rawInbox.channelId] = inbox;
  }
  get array() {
    return Object.values(this.cache);
  }
  get get() {
    return (channelId: string) =>
      this.cache[channelId] as InboxItem | undefined;
  }
}

export class InboxItem {
  id: string;

  store: Store;
  channelId: string;
  recipientId: string;

  constructor(store: Store, inbox: RawInboxWithoutChannel) {
    this.store = store;

    this.store.users.addCache(inbox.recipient);
    const channel = this.store.channels.get(inbox.channelId);
    channel?.setRecipientId(inbox.recipient.id);
    channel?.recipient?.setInboxChannelId(inbox.channelId);

    makeAutoObservable(this, {
      id: false,
      channelId: false,
      recipientId: false,
      store: false,
    });
    this.id = inbox.id;
    this.channelId = inbox.channelId;
    this.recipientId = inbox.recipient.id;
  }
  get channel() {
    return this.store.channels.get(this.channelId);
  }
  get recipient() {
    return this.store.users.get(this.recipientId);
  }
}