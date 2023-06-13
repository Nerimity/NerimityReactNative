import {makeAutoObservable} from 'mobx';
import {RawServer} from './RawData';
import {Store} from './store';
import {computedFn} from 'mobx-utils';

export class Servers {
  cache: Record<string, Server> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  reset() {
    this.cache = {};
  }
  addCache(rawServer: RawServer) {
    const server = new Server(this.store, rawServer);
    this.cache[server.id] = server;
  }
  get array() {
    return Object.values(this.cache);
  }

  get get() {
    return (serverId: string) => this.cache[serverId] as Server | undefined;
  }

  get orderedArray() {
    const serverIdsArray = this.store.account.user?.orderedServerIds;
    const order: Record<string, number> = {};
    serverIdsArray?.forEach((a, i) => {
      order[a] = i;
    });

    return this.array
      .sort((a, b) => a.createdAt - b.createdAt)
      .sort((a, b) => {
        const orderA = order[a.id];
        const orderB = order[b.id];
        if (orderA === undefined) {
          return -1;
        }
        if (orderB === undefined) {
          return 1;
        }
        return orderA - orderB;
      });
  }
}

export class Server {
  id: string;
  name: string;
  avatar?: string;
  hexColor: string;
  createdById: string;
  defaultRoleId: string;
  createdAt: number;
  store: Store;
  constructor(store: Store, server: RawServer) {
    makeAutoObservable(this, {id: false, store: false});
    this.store = store;
    this.id = server.id;
    this.name = server.name;
    this.avatar = server.avatar;
    this.hexColor = server.hexColor;
    this.createdById = server.createdById;
    this.defaultRoleId = server.defaultRoleId;
    this.createdAt = server.createdAt;
  }

  get hasNotifications() {
    return this.store.channels
      .getChannelsByServerId(this.id)
      .find(channel => channel.hasNotifications());
  }

  get avatarUrl() {
    return `https://cdn.nerimity.com/${this.avatar}`;
  }

  getRolesWithMembers = computedFn(function getRolesWithMembers(this: Server) {
    const members = this.store.serverMembers.array(this.id);
    return this.store.serverRoles.sortedRolesArray(this.id).map(role => {
      const membersInThisRole = members.filter(member => {
        if (!member?.user.presence?.status) {
          return false;
        }
        if (this.defaultRoleId === role!.id && !member?.unhiddenRole()) {
          return true;
        }
        if (member?.unhiddenRole()?.id === role!.id) {
          return true;
        }
      });
      return {role, members: membersInThisRole};
    });
  });

  get defaultRole() {
    return this.store.serverRoles.get(this.id, this.defaultRoleId)!;
  }

  getOfflineMembers = computedFn(function getOfflineMembers(this: Server) {
    const members = this.store.serverMembers.array(this.id);
    return members.filter(member => !member?.user.presence?.status);
  });
}
