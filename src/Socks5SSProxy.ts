///<reference path="../node_modules/@types/node/index.d.ts"/>

import * as net from "net"
import * as crypto from "crypto";
import * as events from "events";

import SSCrypto from "./Crypto/SSCrypto";
import { ISSCryptoMethod } from "./Crypto/ISSCryptoMethod";

import Socks5SSProxyTcpProcess, { Socks5SSProxyProcessConfig } from "./Socks5SSProxyTcpProcess";

export default class Socks5SSProxy extends events.EventEmitter {

    private readonly proxyServer: net.Server = null;
    private processes: Array<Socks5SSProxyTcpProcess> = [];

    constructor(
        private readonly localPort: number,
        private readonly targetHost: string,
        private readonly targetPort: number,
        private readonly ssMethod: string,
        private readonly ssPassword: string,
    ) {
        super();
        this.proxyServer = net.createServer(this.onClientConnect.bind(this));
        this.proxyServer.on("error", (err) => this.emit("error", err));
    }

    listen(listeningListener?: Function) {
        this.proxyServer.listen(this.localPort, listeningListener);
    }

    close() {
        this.proxyServer.close();
        this.processes.forEach(process => process.clearConnect());
    }

    private onClientConnect(client: net.Socket) {
        var encryptMethod: ISSCryptoMethod = null;
        try {
            encryptMethod = SSCrypto.createCryptoMethodObject(this.ssMethod, this.ssPassword);
        } catch (error) {
            this.emit("error", error);
            return client.destroy();
        }

        var process: Socks5SSProxyTcpProcess = new Socks5SSProxyTcpProcess({
            targetHost: this.targetHost,
            targetPort: this.targetPort,
            clientSocket: client,
            encryptMethod: encryptMethod,
        });
        this.emit("clientConnected", process);
        this.processes.push(process);
        process.on("close", function () {
            var index = this.processes.indexOf(process);
            if (index > -1) this.processes.splice(index, 1);
        }.bind(this));
    }
}
