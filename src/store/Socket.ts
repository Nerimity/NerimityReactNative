import io, {Socket as IOSocket} from 'socket.io-client';
import {Store} from './store';
import {ClientEvents, ServerEvents} from './EventNames';
import {transaction} from 'mobx';
import config from '../../config';

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
  }
  onConnect() {
    console.log('Authenticating...');
    this.io.emit(ClientEvents.AUTHENTICATE, {token: config.token});
  }
  onAuthenticated(payload: any) {
    console.log('Authenticated!');
    transaction(() => {
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
}
