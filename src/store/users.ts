import {makeAutoObservable, transaction} from 'mobx';
import {RawUser} from './RawData';
import {Store} from './store';
import {openDMChannelRequest} from '../services/UserService';

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
  reset() {
    this.cache = {};
  }
  addCache(rawUser: RawUser) {
    if (this.get(rawUser.id)) {
      return;
    }
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
  hexColor: string;
  avatar?: string;
  store: Store;
  presence?: Presence;
  inboxChannelId?: string;

  constructor(store: Store, user: RawUser) {
    this.store = store;
    this.presence = undefined;
    this.inboxChannelId = undefined;
    this.username = user.username;
    this.hexColor = user.hexColor;
    this.avatar = user.avatar;
    this.tag = user.tag;
    makeAutoObservable(this, {id: false, store: false});
    this.id = user.id;
  }
  update(update: Partial<RawUser>) {
    this.username = update.username ?? this.username;
    this.tag = update.tag ?? this.tag;
    this.avatar = update.avatar ?? this.avatar;
    this.hexColor = update.hexColor ?? this.hexColor;
  }
  updatePresence(presence: Partial<Presence>) {
    this.presence = presence as Presence;
    if (!presence.status) {
      this.presence = undefined;
    }
  }
  setInboxChannelId(channelId: string) {
    this.inboxChannelId = channelId;
  }
  async openDMChannel() {
    const inboxItem = () => this.store.inbox.get(this.inboxChannelId!);
    if (inboxItem()) {
      return inboxItem()!.channel;
    }
    const rawInbox = await openDMChannelRequest(this.id);

    transaction(() => {
      this.store.channels.addCache(rawInbox.channel!);

      this.store.inbox.addCache({...rawInbox, channelId: rawInbox.channel?.id});
    });

    return inboxItem()!.channel;
  }
}
