import {makeAutoObservable} from 'mobx';
import {RawServerMember} from './RawData';
import {Store} from './store';
import {Bitwise, ROLE_PERMISSIONS, addBit, hasBit} from '../utils/bitwise';
import {computedFn} from 'mobx-utils';

// export type ServerMember = Omit<RawServerMember, 'user'> & {
//   userId: string
//   user: User
//   update: (this: ServerMember, update: Partial<ServerMember>) => void;
//   roles: () => (ServerRole | undefined)[] ;
//   hasRole:  (this: ServerMember, roleId: string) => boolean;
//   permissions: () => number;
//   hasPermission:  (this: ServerMember, bitwise: Bitwise, ignoreAdmin?: boolean) => boolean | void;
//   roleColor: () => string;
//   unhiddenRole: () => ServerRole;
//   amIServerCreator: () => boolean;
// }

export class ServerMembers {
  cache: Record<string, Record<string, ServerMember>> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }
  addCache(rawServerMember: RawServerMember) {
    const user = new ServerMember(this.store, rawServerMember);
    if (!this.cache[rawServerMember.serverId]) {
      this.cache[rawServerMember.serverId] = {};
    }
    this.cache[rawServerMember.serverId][rawServerMember.user.id] = user;
  }
  get array() {
    return Object.values(this.cache);
  }
  get get() {
    return (serverId: string, userId: string) =>
      this.cache[serverId]?.[userId] as ServerMember | undefined;
  }
}

export class ServerMember {
  store: Store;
  serverId: string;
  roleIds: string[];
  constructor(store: Store, serverMember: RawServerMember) {
    this.store = store;
    this.store.users.addCache(serverMember.user);
    makeAutoObservable(this, {store: false, serverId: false});
    this.serverId = serverMember.serverId;
    this.roleIds = serverMember.roleIds;
  }
  roles = computedFn(function roles(this: ServerMember) {
    return this.roleIds.map(id => {
      return this.store.serverRoles.get(this.serverId, id);
    });
  });
  getPermissions = computedFn(function permissions(this: ServerMember) {
    const defaultRoleId = this.store.servers.cache[this.serverId].defaultRoleId;
    const defaultRole = this.store.serverRoles.get(
      this.serverId,
      defaultRoleId,
    );
    let currentPermissions = 0;
    currentPermissions = addBit(
      currentPermissions,
      defaultRole?.permissions || 0,
    );
    const roles = this.roles();
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      currentPermissions = addBit(currentPermissions, role?.permissions || 0);
    }
    return currentPermissions;
  }, true);

  get server() {
    return this.store.servers.cache[this.serverId];
  }

  get amIServerCreator() {
    return this.server!.createdById === this.store.account.user?.id;
  }
  get hasPermission() {
    return (bitwise: Bitwise, ignoreAdmin = false) => {
      if (!ignoreAdmin) {
        if (hasBit(this.getPermissions(), ROLE_PERMISSIONS.ADMIN.bit)) {
          return true;
        }
      }
      return hasBit(this.getPermissions(), bitwise.bit);
    };
  }
}
