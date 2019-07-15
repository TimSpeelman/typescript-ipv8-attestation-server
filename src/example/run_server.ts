import { AttestationServer } from "../server/AttestationServer";
import { serverPeer } from "./config";
import { config } from "./procedure";

const options = {
    ipv8_url: serverPeer.ipv8_url,
    http_port: serverPeer.rest_port,
};

const server = new AttestationServer(config, options);

server.start();
