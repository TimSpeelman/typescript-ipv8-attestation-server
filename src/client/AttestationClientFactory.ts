import { IPv8API } from "../ipv8/IPv8API";
import { VerifieeService } from "../ipv8/VerifieeService";
import { AttestationClient } from "./AttestationClientRunner";

export class AttestationClientFactory {
    constructor(
        private config: AttestationClientConfig,
        private time = Date.now,
    ) { }

    public create() {
        const api = new IPv8API(this.config.ipv8_url);
        const verifieeService = new VerifieeService(api, this.time);
        return new AttestationClient(
            {
                mid_hex: this.config.mid_hex,
                mid_b64: this.config.mid_b64,
            },
            api,
            verifieeService
        );
    }
}

export interface AttestationClientConfig {
    ipv8_url: string;
    mid_hex: string;
    mid_b64: string;
}
