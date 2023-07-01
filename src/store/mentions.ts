import {makeAutoObservable, remove as removeItem} from 'mobx';
import {Store} from './store';
import {ServerNotificationPingMode} from './RawData';

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
    const channel = this.store.channels.get(channelId);

    if (channel?.serverId) {
      const notificationPingMode = this.store.account.settingsByServerId(
        channel.serverId,
      )?.notificationPingMode;
      if (notificationPingMode === ServerNotificationPingMode.MUTE) {
        return;
      }
    }

    this.cache[channelId] = mention;
  }
  remove(channelId: string) {
    removeItem(this.cache, channelId);
  }
  get get() {
    return (channelId: string) => this.cache[channelId] as Mention | undefined;
  }

  get array() {
    return Object.values(this.cache);
  }

  get getDmCount() {
    return (userId: string) =>
      this.array.find(m => {
        const channel = this.store.channels.get(m.channelId!);
        return m?.userId === userId && (!channel || channel.recipientId);
      })?.count || 0;
  }
}
