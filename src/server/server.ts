import { AttesterService } from "../ipv8/AttesterService";
import { IPv8API } from "../ipv8/IPv8API";
import { IPv8Service } from "../ipv8/IPv8Service";
import { Dict } from "../ipv8/types/Dict";
import { VerifierService } from "../ipv8/VerifierService";
import { ProcedureConfig } from "../types/types";
import { AttestationRequestResolver } from "./attestation.server";
import { HttpAttestationServer } from "./http.server";

export class AttestationServer {

    constructor(
        private procedures: Dict<ProcedureConfig>,
        private config: AttestationServerConfig,
        private time = Date.now,
    ) { }

    public start() {
        const time = Date.now;
        const api = new IPv8API(this.config.ipv8_url);
        const service = new IPv8Service(api);
        const attesterService = new AttesterService(service, time);
        const verifierService = new VerifierService(service, time);
        const requestResolver = new AttestationRequestResolver(
            attesterService,
            verifierService,
            time,
            { attestationTimeoutInSeconds: 60 }
        );

        const httpServer = new HttpAttestationServer(
            this.procedures,
            requestResolver,
            this.config.http_port,
        );

        // Need to start polling
        service.start();
        httpServer.start();
    }
}

export interface AttestationServerConfig {
    ipv8_url: string;
    http_port: number;
}
