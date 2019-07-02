import axios from "axios";
import { interval } from "rxjs";
import { Attestation, IPv8API } from "./ipv8/ipv8.api";
import { AttProcedure, Credential, PeerId } from "./types/types";
import { promiseTimer } from "./util/promiseTimer";
import { queryString } from "./util/queryString";

export class AttestationClient {
    public max_trials: number = 3;
    public poll_interval_ms: number = 1000;
    constructor(private me: PeerId, private api: IPv8API) { }

    public async execute(procedure: AttProcedure, credential_value: string) {
        console.log("Initiating attestation procedure");
        const hash = await this.fetchCredentialHash(procedure.credential_name);
        const credential = {
            attribute_name: procedure.credential_name,
            attribute_hash: hash,
            attribute_value: credential_value,
        };
        await this.initiateTransaction(procedure, [credential]);
        console.log("Polling for credential verification request..");
        await this.acceptFirstVerificationOnRequest(procedure.server.mid_b64, procedure.credential_name);
        console.log("Verification accepted.");
        console.log("Polling for data..");
        const data = await this.pollData(procedure);
        console.log("Data received:", data);
        console.log("Requesting attestation.");
        await this.requestAttestation(procedure);
        console.log("Polling for attestation..");
        const attestation = await this.awaitAttestation(procedure);
        console.log("Attestion received. Complete.");
        return {
            data,
            attestation
        };
    }

    /** Check that we have an attestation for a given attribute */
    protected async fetchCredentialHash(attribute_name: string): Promise<string> {
        const attestations = await this.api.listAttestations();
        const attestation = attestations.find((a) => a.attribute_name === attribute_name);
        if (!attestation) {
            throw new Error("Client has no BSN attestation!");
        }
        return attestation.attribute_hash;
    }

    /** Initiate the transaction */
    protected initiateTransaction(procedure: AttProcedure, credentials: Credential[]) {
        // Initiate the transaction
        const query_init = {
            procedure_id: procedure.procedure_name,
            mid_hex: this.me.mid_hex,
            mid_b64: this.me.mid_b64,
            credentials: JSON.stringify(credentials),
        };
        return axios.get(`${procedure.server.http_address}/init?${queryString(query_init)}`);
    }

    /** Polls until server's verification request comes in. Then accept it and resolve. */
    protected acceptFirstVerificationOnRequest(mid_b64: string, attribute_name: string): Promise<boolean> {
        return new Promise((resolve) => {
            const sub = interval(1000).subscribe(() => {
                this.api.listVerificationRequests().then((requests) => {
                    const request = requests.find((r) => r.attribute_name === attribute_name && r.mid_b64 === mid_b64);
                    console.log("Verifreqs", requests);
                    if (request) {
                        this.api.allowVerify(request.mid_b64, request.attribute_name).then(() => {
                            sub.unsubscribe();
                            resolve();
                        });
                    }
                });
            });
        });
    }

    /** Fetch the data from the server until it is there */
    protected async pollData(procedure: AttProcedure) {
        let trial = 0;
        while (trial++ < this.max_trials) {
            await promiseTimer(this.poll_interval_ms);
            try {
                const data = await this.fetchData(procedure);
                return data;
            } catch (e) {
                // try again
            }
        }
    }

    /** Fetch the data from the server */
    protected fetchData(procedure: AttProcedure) {
        const query_data = { mid: this.me.mid_b64 };
        return axios.get(`${procedure.server.http_address}/data?${queryString(query_data)}`)
            .then((response) => response.data);
    }

    /** Request the attestation */
    protected async requestAttestation(procedure: AttProcedure) {
        return this.api.requestAttestation(
            procedure.server.mid_b64,
            procedure.attribute_name,
            "id_metadata"
        );
    }

    /** Await the receipt of attestations */
    protected async awaitAttestation(procedure: AttProcedure): Promise<Attestation> {
        return new Promise((resolve) => {
            const sub = interval(1000).subscribe(() => {
                this.api.listAttestations().then((atts) => {
                    const att = atts.find((a) => a.attribute_name === procedure.attribute_name);
                    if (att) {
                        sub.unsubscribe();
                        resolve(att);
                    }
                });
            });
        });
    }

}
