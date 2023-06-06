import {makeAutoObservable} from 'mobx';
import {RawServerRole} from './RawData';
import {Store} from './store';

export class ServerRoles {
  cache: Record<string, Record<string, ServerRole>> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addCache(rawServerRole: RawServerRole) {
    const role = new ServerRole(this.store, rawServerRole);
    if (!this.cache[rawServerRole.serverId]) {
      this.cache[rawServerRole.serverId] = {};
    }
    this.cache[rawServerRole.serverId][rawServerRole.id] = role;
  }
  get get() {
    return (serverId: string, roleId: string) => this.cache[serverId]?.[roleId];
  }
  get array() {
    return Object.values(this.cache);
  }
}

export class ServerRole {
  store: Store;
  id: string;
  name: string;
  permissions: number;
  constructor(store: Store, role: RawServerRole) {
    makeAutoObservable(this, {id: false, store: false});
    this.store = store;
    this.id = role.id;
    this.name = role.name;
    this.permissions = role.permissions;
  }
}
