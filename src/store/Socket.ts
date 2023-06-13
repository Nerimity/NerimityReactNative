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
  RawUser,
} from './RawData';
import {SelfUser} from './account';

interface AuthenticatedPayload {
  user: SelfUser;
  servers: RawServer[];
  serverMembers: RawServerMember[];
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
  constructor(store: Store) {
    this.store = store;
    this.io = io('https://nerimity.com', {
      transports: ['websocket'],
      autoConnect: false,
    });

    // register events
    this.io.on(ServerEvents.CONNECT, this.onConnect.bind(this));
    this.io.on(
      ServerEvents.USER_AUTHENTICATED,
      this.onAuthenticated.bind(this),
    );

    this.io.on(ServerEvents.MESSAGE_CREATED, this.onMessageCreated.bind(this));
    this.io.on(ServerEvents.MESSAGE_UPDATED, this.onMessageUpdated.bind(this));
    this.io.on(ServerEvents.MESSAGE_DELETED, this.onMessageDeleted.bind(this));

    this.io.on(
      ServerEvents.NOTIFICATION_DISMISSED,
      this.onNotificationDismissed.bind(this),
    );
  }

  connect() {
    console.log('Connecting...');
    if (!this.io.connected) {
      this.io.connect();
    }
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

      for (let i = 0; i < payload.channels.length; i++) {
        const channels = payload.channels[i];
        this.store.channels.addCache(channels);
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
        const channel = this.store.channels.get(mention.channelId);
        if (!channel) {
          continue;
        }
        if (!mention.serverId) {
          // TODO: handle this later PLSS
          continue;
        }
        this.store.mentions.set(mention.channelId, {
          channelId: mention.channelId,
          userId: mention.mentionedById,
          count: mention.count,
          serverId: mention.serverId,
        });
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

    const channel = this.store.channels.get(payload.message.channelId);
    channel?.updateLastMessaged(payload.message.createdAt);

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
}
