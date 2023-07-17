import { makeAutoObservable } from 'mobx';
import { ChannelType, RawServer, ServerNotificationPingMode } from './RawData';
import { Store } from './store';
import { computedFn } from 'mobx-utils';


export interface FileAttach {
  uri: string;
  name: string;
  type: string;
}

interface RawChannelProperty {
  content: string;
  attachment?: FileAttach;
}

export class ChannelProperties {
  cache: Record<string, ChannelProperty> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, { store: false });
  }
  reset() {
    this.cache = {};
  }
  get get() {
    return (channelId: string) => this.cache[channelId] as ChannelProperty | undefined;
  }
  initChannelProperty(channelId: string) {
    if (this.cache[channelId]) return;
    const channelProperty = new ChannelProperty(this.store, {
      content: '',
    });
    this.cache[channelId] = channelProperty;
  }
}

export class ChannelProperty {
  store: Store;
  attachment: FileAttach | undefined;
  content: string;
  constructor(store: Store, channelProperty: RawChannelProperty) {
    this.attachment = channelProperty.attachment
    this.content = channelProperty.content
    makeAutoObservable(this, { store: false });
    this.store = store;
  }
  setContent(content: string) {
    this.content = content;
  }
  setAttachment(attachment: FileAttach | undefined) {
    this.attachment = attachment;
  }
}
