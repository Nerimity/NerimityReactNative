import {makeAutoObservable, runInAction} from 'mobx';
import {MessageType, RawMessage} from './RawData';
import {Store} from './store';
import {fetchMessages, postMessage} from '../services/MessageService';
import { FileAttach } from './channelProperties';

export enum MessageSentStatus {
  SENDING = 0,
  FAILED = 1,
}

export type Message = RawMessage & {
  sentStatus?: MessageSentStatus;
};

export class Messages {
  cache: Record<string, Message[]> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }

  addMessage(channelId: string, message: Message) {
    this.store.messages.cache[channelId]?.unshift?.(message);
    return this.store.messages.cache[channelId]?.[0];
  }

  async fetchAndCacheMessages(channelId: string, force = false) {
    if (this.cache[channelId] && !force) {
      return;
    }
    const messages = await fetchMessages(channelId);
    runInAction(() => (this.cache[channelId] = messages.reverse()));
  }

  async postMessage(channelId: string, content: string, fileAttach?: FileAttach) {
    const self = this.store.account.user!;
    const localMessage = this.addMessage(channelId, {
      id: `${Date.now()}-${Math.random()}`,
      channelId,
      content: fileAttach ? `${content || ""}\nUploading ${fileAttach.name}...`: content,
      createdAt: Date.now(),
      sentStatus: MessageSentStatus.SENDING,
      type: MessageType.CONTENT,
      reactions: [],
      quotedMessages: [],
      createdBy: {
        id: self.id,
        username: self.username,
        tag: self.tag,
        badges: self.badges,
        hexColor: self.hexColor,
        avatar: self.avatar,
      },
    });

    const message = await postMessage({
      channelId,
      content,
      socketId: this.store.socket.io.id,
      attachment: fileAttach
    }).catch(err => console.log(err));
    this.updateMessage(channelId, localMessage.id, {
      ...message,
      sentStatus: message ? undefined : MessageSentStatus.FAILED,
    });
  }

  updateMessage(
    channelId: string,
    messageId: string,
    message: Partial<Message>,
  ) {
    const index = this.cache[channelId]?.findIndex?.(m => m.id === messageId);
    if (index === undefined || index < 0) {
      return;
    }
    this.cache[channelId][index] = Object.assign(
      {},
      this.cache[channelId][index],
      message,
    );
  }
  deleteMessage(channelId: string, messageId: string) {
    const index = this.cache[channelId]?.findIndex?.(m => m.id === messageId);
    if (index === undefined || index < 0) {
      return;
    }
    this.cache[channelId].splice(index, 1);
  }

  get channelMessages() {
    return (channelId: string) =>
      this.cache[channelId] as RawMessage[] | undefined;
  }
}
