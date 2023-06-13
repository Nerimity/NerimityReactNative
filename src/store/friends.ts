import {makeAutoObservable} from 'mobx';
import {FriendStatus, RawFriend} from './RawData';
import {Store} from './store';

export class Friends {
  cache: Record<string, Friend> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }
  addCache(rawFriend: RawFriend) {
    const friend = new Friend(this.store, rawFriend);
    this.cache[rawFriend.recipient.id] = friend;
  }
  get array() {
    return Object.values(this.cache);
  }
  get get() {
    return (userId: string) => this.cache[userId] as Friend | undefined;
  }
}

export class Friend {
  recipientId: string;
  status: FriendStatus;
  store: Store;

  constructor(store: Store, friend: RawFriend) {
    this.store = store;
    this.store.users.addCache(friend.recipient);
    makeAutoObservable(this, {recipientId: false});
    this.recipientId = friend.recipient.id;
    this.status = friend.status;
  }
  get recipient() {
    return this.store.users.get(this.recipientId)!;
  }
}
