import io, {Socket as IOSocket} from 'socket.io-client';
import {Store} from './store';
import {ClientEvents, ServerEvents} from './EventNames';
import {transaction} from 'mobx';
import {
  RawChannel,
  RawFriend,
  RawInboxWithoutChannel,
  RawMessage,
  RawPresence,
  RawServer,
  RawServerMember,
  RawServerRole,
  RawServerSettings,
  RawUser,
} from './RawData';
import {SelfUser} from './account';
import {UserStatus} from './users';

interface AuthenticatedPayload {
  user: SelfUser;
  servers: RawServer[];
  serverMembers: RawServerMember[];
  serverSettings: RawServerSettings[];
  messageMentions: MessageMention[];
  channels: RawChannel[];
  serverRoles: RawServerRole[];
  presences: RawPresence[];
  friends: RawFriend[];
  inbox: RawInboxWithoutChannel[];
  lastSeenServerChannelIds: Record<string, number>; // { [channelId]: timestamp }
}

interface MessageMention {
  mentionedById: string;
  mentionedBy: RawUser;
  count: number;
  serverId?: string;
  channelId: string;
  createdAt: number;
}

export class Socket {
  io: IOSocket;
  store: Store;
  socketEvents: SocketEvents;
  constructor(store: Store) {
    this.store = store;
    this.io = io('https://nerimity.com', {
      transports: ['websocket'],
      autoConnect: false,
    });
    this.socketEvents = new SocketEvents(this.store, this.io);
  }

  connect() {
    console.log('Connecting...');
    if (!this.io.connected) {
      this.io.connect();
    }
  }

  dismissChannelNotification(channelId: string) {
    this.io.emit(ClientEvents.NOTIFICATION_DISMISS, {channelId});
  }
}

class SocketEvents {
  store: Store;
  io: IOSocket;
  constructor(store: Store, io: IOSocket) {
    this.store = store;
    this.io = io;

    // register events
    this.io.on(ServerEvents.CONNECT, this.onConnect.bind(this));
    this.io.on(
      ServerEvents.USER_AUTHENTICATED,
      this.onAuthenticated.bind(this),
    );

    this.io.on(
      ServerEvents.USER_PRESENCE_UPDATE,
      this.onUserPresenceUpdate.bind(this),
    );

    this.io.on(ServerEvents.MESSAGE_CREATED, this.onMessageCreated.bind(this));
    this.io.on(ServerEvents.MESSAGE_UPDATED, this.onMessageUpdated.bind(this));
    this.io.on(ServerEvents.MESSAGE_DELETED, this.onMessageDeleted.bind(this));

    this.io.on(ServerEvents.INBOX_OPENED, this.onInboxOpened.bind(this));

    this.io.on(
      ServerEvents.NOTIFICATION_DISMISSED,
      this.onNotificationDismissed.bind(this),
    );
  }
  onConnect() {
    console.log('Authenticating...');
    this.io.emit(ClientEvents.AUTHENTICATE, {token: this.store.account.token});
  }
  onAuthenticated(payload: AuthenticatedPayload) {
    console.log('Authenticated!');
    transaction(() => {
      this.store.account.addSelfUser(payload.user);
      this.store.users.addCache(payload.user);

      for (let i = 0; i < payload.friends.length; i++) {
        const friend = payload.friends[i];
        this.store.friends.addCache(friend);
      }

      for (let i = 0; i < payload.serverRoles.length; i++) {
        const role = payload.serverRoles[i];
        this.store.serverRoles.addCache(role);
      }

      for (let i = 0; i < payload.servers.length; i++) {
        const server = payload.servers[i];
        this.store.servers.addCache(server);
      }
      for (let i = 0; i < payload.serverSettings.length; i++) {
        const serverSettings = payload.serverSettings[i];
        this.store.account.addServerSettings(
          serverSettings.serverId,
          serverSettings,
        );
      }

      for (let i = 0; i < payload.channels.length; i++) {
        const channels = payload.channels[i];
        this.store.channels.addCache(channels);
      }
      for (let i = 0; i < payload.inbox.length; i++) {
        const inboxItem = payload.inbox[i];
        this.store.inbox.addCache(inboxItem);
      }
      for (let i = 0; i < payload.serverMembers.length; i++) {
        const serverMember = payload.serverMembers[i];
        this.store.serverMembers.addCache(serverMember);
      }
      for (let i = 0; i < payload.presences.length; i++) {
        const presence = payload.presences[i];
        this.store.users.get(presence.userId)?.updatePresence(presence);
      }

      for (let i = 0; i < payload.messageMentions.length; i++) {
        const mention = payload.messageMentions[i];
        this.store.mentions.set(mention.channelId, {
          channelId: mention.channelId,
          userId: mention.mentionedById,
          count: mention.count,
          serverId: mention.serverId,
        });

        this.store.users.addCache(mention.mentionedBy);

        const channel = this.store.channels.get(mention.channelId);
        if (!channel) {
          continue;
        }
        if (!mention.serverId) {
          channel.updateLastSeen(mention.createdAt);
          continue;
        }
      }

      for (let channelId in payload.lastSeenServerChannelIds) {
        const timestamp = payload.lastSeenServerChannelIds[channelId];
        this.store.channels.get(channelId)?.updateLastSeen(timestamp);
      }
    });
  }
  onMessageCreated(payload: {message: RawMessage; socketId?: string}) {
    if (payload.socketId === this.io.id) {
      return;
    }
    const selfUser = this.store.account.user;

    const channel = this.store.channels.get(payload.message.channelId);

    transaction(() => {
      channel?.updateLastMessaged(payload.message.createdAt);

      if (selfUser?.id === payload.message.createdBy.id) {
        channel?.updateLastSeen(payload.message.createdAt + 1);
      } else if (!channel || channel.recipient) {
        this.store.users.addCache(payload.message.createdBy);
      }
    });

    if (selfUser?.id !== payload.message.createdBy.id) {
      const mentionCount =
        this.store.mentions.get(payload.message.channelId)?.count || 0;

      const isMentioned = payload.message.mentions?.find(
        u => u.id === this.store.account.user?.id!,
      );

      if (!channel?.serverId || isMentioned) {
        this.store.mentions.set(payload.message.channelId, {
          channelId: payload.message.channelId,
          userId: payload.message.createdBy.id,
          count: mentionCount + 1,
          serverId: channel?.serverId,
        });
      }
    }

    this.store.messages.addMessage(payload.message.channelId, payload.message);
  }
  onMessageUpdated(payload: {
    channelId: string;
    messageId: string;
    updated: RawMessage;
  }) {
    this.store.messages.updateMessage(
      payload.channelId,
      payload.messageId,
      payload.updated,
    );
  }
  onMessageDeleted(payload: {channelId: string; messageId: string}) {
    this.store.messages.deleteMessage(payload.channelId, payload.messageId);
  }
  onNotificationDismissed(payload: {channelId: string}) {
    const channel = this.store.channels.get(payload.channelId);
    transaction(() => {
      channel?.updateLastSeen((channel.lastMessagedAt || Date.now()) + 1);
      this.store.mentions.remove(payload.channelId);
    });
  }
  onInboxOpened(payload: RawInboxWithoutChannel & {channel: RawChannel}) {
    transaction(() => {
      this.store.channels.addCache(payload.channel);
      this.store.inbox.addCache({...payload, channelId: payload.channel.id});
    });
  }
  onUserPresenceUpdate(payload: {
    status?: UserStatus;
    custom?: string;
    userId: string;
  }) {
    const user = this.store.users.get(payload.userId);
    if (!user) {
      return;
    }
    const newPresence = {
      ...user.presence,
      ...(payload.status !== undefined ? {status: payload.status} : undefined),
      ...(payload.custom ? {custom: payload.custom} : undefined),
    };
    if (payload.status === null) {
      delete newPresence.status;
    }
    if (payload.custom === null) {
      delete newPresence.custom;
    }

    user?.updatePresence(newPresence);
  }
}
