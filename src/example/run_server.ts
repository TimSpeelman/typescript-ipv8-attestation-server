import { AttesterService } from "../ipv8/AttesterService";
import { IPv8API } from "../ipv8/IPv8API";
import { IPv8Service } from "../ipv8/IPv8Service";
import { VerifierService } from "../ipv8/VerifierService";
import { AttestationServer } from "../server/attestation.server";
import { HttpAttestationServer } from "../server/http.server";
import { serverPeer } from "./config";
import { config } from "./procedure";

const time = Date.now;
const api = new IPv8API(serverPeer.ipv8_url);
const service = new IPv8Service(api);
const attesterService = new AttesterService(service, time);
const verifierService = new VerifierService(service, time);
const attServ = new AttestationServer(attesterService, verifierService, time, {attestationTimeoutInSeconds: 60});

const httpServer = new HttpAttestationServer(config, attServ, serverPeer.rest_port);

// Need to start polling
service.start();
httpServer.start();
