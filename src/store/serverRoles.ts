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

  get sortedRolesArray() {
    return (serverId: string) =>
      Object.values(this.cache[serverId] || {}).sort(
        (a, b) => b!.order - a!.order,
      );
  }
}

export class ServerRole {
  store: Store;
  id: string;
  name: string;
  hexColor: string;
  order: number;
  permissions: number;
  hideRole: boolean;
  constructor(store: Store, role: RawServerRole) {
    makeAutoObservable(this, {id: false, store: false});
    this.store = store;
    this.id = role.id;
    this.name = role.name;
    this.permissions = role.permissions;
    this.order = role.order;
    this.hideRole = role.hideRole;
    this.hexColor = role.hexColor;
  }
}
