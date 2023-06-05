import {makeAutoObservable} from 'mobx';
import {Store} from './store';

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
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addSelfUser(newUser: SelfUser) {
    this.user = newUser;
  }
}
