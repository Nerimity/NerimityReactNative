import {makeAutoObservable} from 'mobx';
import {RawUser} from './RawData';
import {Store} from './store';

export enum UserStatus {
  OFFLINE = 0,
  ONLINE = 1,
  LTP = 2, // Looking To Play
  AFK = 3, // Away from keyboard
  DND = 4, // Do not disturb
}

export interface Presence {
  custom?: string | null;
  status: UserStatus;
}

// export type User = RawUser & {
//   presence?: Presence;
//   inboxChannelId?: string;
//   setInboxChannelId: (this: User, channelId: string) => void;
//   openDM: (this: User) => Promise<void>;
//   avatarUrl(this: User): string | null;
//   bannerUrl(this: User): string | null;
//   update(this: User, update: Partial<RawUser>): void;
// };

export class Users {
  cache: Record<string, User> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addCache(rawUser: RawUser) {
    const user = new User(this.store, rawUser);
    this.cache[user.id] = user;
  }
  get array() {
    return Object.values(this.cache);
  }
  get get() {
    return (userId: string) => this.cache[userId] as User | undefined;
  }
}

export class User {
  id: string;
  username: string;
  tag: string;
  store: Store;

  constructor(store: Store, user: RawUser) {
    this.store = store;
    makeAutoObservable(this, {id: false, store: false});
    this.id = user.id;
    this.username = user.username;
    this.tag = user.tag;
  }
}
