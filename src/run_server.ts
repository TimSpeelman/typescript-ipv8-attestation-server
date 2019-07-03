import { serverPeer } from "./config";
import { IPv8API } from "./ipv8/ipv8.api";
import { IPv8Service } from "./ipv8/ipv8.service";
import { config } from "./procedure";
import { AttestationServer } from "./server/attestation.server";
import { HttpAttestationServer } from "./server/http.server";

const api = new IPv8API(serverPeer.ipv8_url);
const service = new IPv8Service(api);
const attServ = new AttestationServer(service);

const httpServer = new HttpAttestationServer(config, attServ, serverPeer.rest_port);

httpServer.start();
