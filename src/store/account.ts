import {makeAutoObservable} from 'mobx';
import {Store} from './store';
import {getUserToken, storeUserId} from '../utils/EncryptedStore';

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
  constructor(store: Store) {
    this.store = store;
    this.token = undefined;
    makeAutoObservable(this, {store: false});
    getUserToken().then(token => this.setToken(token));
  }
  reset() {
    this.user = null;
    this.token = undefined;
    getUserToken().then(token => this.setToken(token));
  }
  setToken(token: string | null) {
    this.token = token;
  }
  addSelfUser(newUser: SelfUser) {
    this.user = newUser;
    storeUserId(newUser.id);
  }
}
