import io, {Socket as IOSocket} from 'socket.io-client';
import {Store} from './store';
import {ClientEvents, ServerEvents} from './EventNames';
import {transaction} from 'mobx';
import config from '../../config';
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
    console.log('Connecting...');
    this.io = io('https://nerimity.com', {transports: ['websocket']});

    // register events
    this.io.on(ServerEvents.CONNECT, this.onConnect.bind(this));
    this.io.on(
      ServerEvents.USER_AUTHENTICATED,
      this.onAuthenticated.bind(this),
    );

    this.io.on(ServerEvents.MESSAGE_CREATED, this.onMessageCreated.bind(this));
    this.io.on(ServerEvents.MESSAGE_UPDATED, this.onMessageUpdated.bind(this));
    this.io.on(ServerEvents.MESSAGE_DELETED, this.onMessageDeleted.bind(this));
  }
  onConnect() {
    console.log('Authenticating...');
    this.io.emit(ClientEvents.AUTHENTICATE, {token: config.token});
  }
  onAuthenticated(payload: AuthenticatedPayload) {
    console.log('Authenticated!');
    transaction(() => {
      this.store.account.addSelfUser(payload.user);

      for (let i = 0; i < payload.servers.length; i++) {
        const server = payload.servers[i];
        this.store.servers.addCache(server);
      }

      for (let i = 0; i < payload.channels.length; i++) {
        const channels = payload.channels[i];
        this.store.channels.addCache(channels);
      }
    });
  }
  onMessageCreated(payload: {message: RawMessage; socketId?: string}) {
    if (payload.socketId === this.io.id) {
      return;
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
}
