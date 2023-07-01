import {makeAutoObservable, set} from 'mobx';
import {Store} from './store';
import {getUserToken, storeUserId} from '../utils/EncryptedStore';
import {RawServerSettings} from './RawData';

type ServerSettings = Omit<RawServerSettings, 'serverId'>;
export interface SelfUser {
  id: string;
  email: string;
  username: string;
  hexColor: string;
  avatar?: string;
  banner?: string;
  badges: number;
  tag: string;
  orderedServerIds: string[];
}

export class Account {
  user: SelfUser | null = null;
  store: Store;
  token?: string | null;
  serverSettings: Record<string, ServerSettings> = {};
  constructor(store: Store) {
    this.store = store;
    this.token = undefined;
    makeAutoObservable(this, {store: false});
    getUserToken().then(token => this.setToken(token));
  }
  reset() {
    this.user = null;
    this.token = undefined;
    this.serverSettings = {};
    getUserToken().then(token => this.setToken(token));
  }
  setToken(token: string | null) {
    this.token = token;
  }
  addSelfUser(newUser: SelfUser) {
    this.user = newUser;
    storeUserId(newUser.id);
  }
  updateServerSettings(serverId: string, update: Partial<RawServerSettings>) {
    this.serverSettings[serverId] = {
      ...this.serverSettings[serverId],
      ...update,
    };
  }
  addServerSettings(serverId: string, settings: RawServerSettings) {
    delete settings.serverId;
    this.serverSettings[serverId] = settings;
  }
  get settingsByServerId() {
    return (serverId: string) => this.serverSettings[serverId];
  }
}
