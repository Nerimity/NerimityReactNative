import {makeAutoObservable} from 'mobx';
import {ChannelType, RawChannel} from './RawData';
import {Store} from './store';
import {CHANNEL_PERMISSIONS, ROLE_PERMISSIONS, hasBit} from '../utils/bitwise';
import {computedFn} from 'mobx-utils';
import {AppState} from 'react-native';

export class Channels {
  cache: Record<string, Channel> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }
  addCache(rawChannel: RawChannel) {
    const channel = new Channel(this.store, rawChannel);
    this.cache[channel.id] = channel;
  }

  get getChannelsByServerId() {
    return (serverId: string, hidePrivateIfNoPerm = false) => {
      if (!hidePrivateIfNoPerm) {
        return this.array.filter(channel => channel?.serverId === serverId);
      }

      const member = this.store.serverMembers.get(
        serverId,
        this.store.account.user?.id!,
      );
      const hasAdminPerm =
        member?.hasPermission(ROLE_PERMISSIONS.ADMIN) ||
        member?.amIServerCreator;
      if (hasAdminPerm) {
        return this.array.filter(channel => channel?.serverId === serverId);
      }

      return this.array.filter(channel => {
        const isServerChannel = channel?.serverId === serverId;
        const isPrivateChannel = hasBit(
          channel?.permissions || 0,
          CHANNEL_PERMISSIONS.PRIVATE_CHANNEL.bit,
        );
        return isServerChannel && !isPrivateChannel;
      });
    };
  }

  get getSortedChannelsByServerId() {
    return (serverId: string, hidePrivateIfNoPerm = false) => {
      return this.getChannelsByServerId(serverId, hidePrivateIfNoPerm).sort(
        (a, b) => {
          if (a!.order && b!.order) {
            return a!.order - b!.order;
          } else {
            return a!.createdAt - b!.createdAt;
          }
        },
      );
    };
  }

  get array() {
    return Object.values(this.cache);
  }
  get get() {
    return (channelId: string) => this.cache[channelId] as Channel | undefined;
  }
}

export class Channel {
  id: string;
  name?: string;
  serverId?: string;
  permissions?: number;
  lastMessagedAt?: number;
  createdAt: number;
  lastSeen?: number;
  order?: number;
  store: Store;
  type: ChannelType;
  categoryId?: string;
  recipientId?: string;

  constructor(store: Store, channel: RawChannel) {
    this.store = store;
    this.name = channel.name;
    this.permissions = channel.permissions;
    this.lastMessagedAt = channel.lastMessagedAt;
    this.createdAt = channel.createdAt;
    this.type = channel.type;
    this.lastSeen = undefined;
    this.order = channel.order;
    this.categoryId = channel.categoryId;
    this.recipientId = undefined;
    makeAutoObservable(this, {id: false, serverId: false, store: false});
    this.id = channel.id;
    this.serverId = channel.serverId;
  }
  setRecipientId(userId: string) {
    this.recipientId = userId;
  }

  updateLastSeen(lastSeen: number) {
    this.lastSeen = lastSeen;
  }
  updateLastMessaged(lastMessaged: number) {
    this.lastMessagedAt = lastMessaged;
  }

  dismissNotification(force = false) {
    if (force) {
      return this.store.socket.dismissChannelNotification(this.id);
    }
    if (AppState.currentState !== 'active') {
      return;
    }
    if (!this.hasNotifications) {
      return;
    }
    this.store.socket.dismissChannelNotification(this.id);
  }

  get recipient() {
    return this.store.users.get(this.recipientId!);
  }

  get isAdminChannel() {
    return hasBit(
      this.permissions || 0,
      CHANNEL_PERMISSIONS.PRIVATE_CHANNEL.bit,
    );
  }

  hasNotifications = computedFn(function hasNotifications(this: Channel) {
    if (![ChannelType.DM_TEXT, ChannelType.SERVER_TEXT].includes(this.type)) {
      return false;
    }
    if (this.serverId && this.isAdminChannel) {
      const member = this.store.serverMembers.get(
        this.serverId,
        this.store.account.user?.id!,
      );
      const hasAdminPermission =
        member?.hasPermission(ROLE_PERMISSIONS.ADMIN) ||
        member?.amIServerCreator;
      if (!hasAdminPermission) {
        return false;
      }
    }

    const hasMentions = this.store.mentions.get(this.id)?.count;

    if (hasMentions) {
      return 'mention' as const;
    }

    const lastMessagedAt = this.lastMessagedAt! || 0;
    const lastSeenAt = this.lastSeen! || 0;
    if (!lastSeenAt) {
      return true;
    }
    return lastMessagedAt > lastSeenAt;
  });
}
