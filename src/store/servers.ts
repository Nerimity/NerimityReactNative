import { makeAutoObservable } from "mobx";
import { RawServer } from "./RawData";
import { Store } from "./store";

export class Servers {
    cache: Record<string, Server> = {};
    store: Store;
    constructor(store: Store) {
        this.store = store;
        makeAutoObservable(this, {store: false});
    }
    addCache(rawServer: RawServer) {
        const server = new Server(rawServer);
        this.cache[server.id] = server;
    }
    get array() {
        return Object.values(this.cache);
    }
}


export class Server {
    id: string
    avatar?: string
    hexColor: string;
    constructor(server: RawServer) {
        makeAutoObservable(this, {id: false})
        this.id = server.id;
        this.avatar = server.avatar;
        this.hexColor = server.hexColor;
    }
    get avatarUrl() {
        return `https://cdn.nerimity.com/${this.avatar}`;
    }
}