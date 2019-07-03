import axios, { AxiosError } from "axios";
import { interval } from "rxjs";
import { Attestation, IPv8API } from "./ipv8/ipv8.api";
import { Dict } from "./types/Dict";
import { IVerifieeService } from "./types/IVerifieeService";
import { Attribute, ClientProcedure, Credential, PeerId } from "./types/types";
import { promiseTimer } from "./util/promiseTimer";
import { queryString } from "./util/queryString";
import { strlist } from "./util/strlist";

const log = console.log;

export class AttestationClient {
    public max_trials: number = 20;
    public poll_interval_ms: number = 1000;
    constructor(
        private me: PeerId,
        private api: IPv8API,
        private verifeeService: IVerifieeService,
    ) { }

    public async execute(procedure: ClientProcedure, credential_values: Dict<string>) {
        const { desc } = procedure;
        log(`============= START =============`);
        log(`> Initiating attestation procedure '${procedure.desc.procedure_name}'`);
        log(`> Fetching required credentials: ${strlist(desc.requirements)}.`);
        const credentials = await this.fetchCredentials(desc.requirements, credential_values);
        log(`> Initiating transaction..`);
        const transaction_id = await this.initiateTransaction(procedure, credentials);
        log(`> Awaiting verification of credentials..`);
        await this.verifeeService.stageVerification(
            procedure.server.mid_b64, desc.requirements, Date.now() + 10000);
        log(`> Polling server for attributes..`);
        const data = await this.pollData(procedure, transaction_id);
        log(`> Data received from server:`);
        log(data);
        const expected_num_attrs = desc.attribute_names.length;
        if (!(data instanceof Array)) {
            throw new Error("Expected to receive array of attributes");
        } else if (data.length !== expected_num_attrs) {
            throw new Error(`Expected to receive ${expected_num_attrs} attributes, got ${data.length}.`);
        }
        log(`> Requesting attestations of attributes: ${strlist(desc.attribute_names)}..`);
        const attestations = await this.requestAndAwaitAttestations(procedure);
        // log("> Polling for attestation results..");
        // const attestations = await this.awaitAllAttestations(procedure);
        log("> Attestations received: ");
        log(attestations);
        log(`=========== COMPLETE ============`);

        return {
            data,
            attestations
        };
    }

    protected fetchCredentials(credential_names: string[], values: Dict<string>): Promise<Credential[]> {
        const promises = credential_names.map(async (cName) => {
            const attribute_hash = await this.fetchCredentialHash(cName);
            return {
                attribute_name: cName,
                attribute_hash,
                attribute_value: values[cName],
            };
        });
        return Promise.all(promises);
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
    protected initiateTransaction(procedure: ClientProcedure, credentials: Credential[]): Promise<string> {
        // Initiate the transaction
        const query_init = {
            procedure_id: procedure.desc.procedure_name,
            mid_hex: this.me.mid_hex,
            mid_b64: this.me.mid_b64,
            credentials: JSON.stringify(credentials),
        };
        return axios.get(`${procedure.server.http_address}/init?${queryString(query_init)}`)
            .then((response) => response.data.transaction_id)
            .catch(this.logAxiosError.bind(this));
    }

    protected async pollData(procedure: ClientProcedure, transaction_id: string): Promise<Attribute[]> {
        const data = await this.pollAllData(procedure, transaction_id);
        if (!(data instanceof Array)) {
            throw new Error("Expected to receive array of attributes");
        }
        const attr_names = procedure.desc.attribute_names;
        const relevant_data = data.filter((d) => attr_names.indexOf(d.attribute_name) >= 0);

        if (relevant_data.length !== attr_names.length) {
            throw new Error(`Expected ${attr_names.length} attributes, received ${relevant_data.length}.`);
        }
        return relevant_data;
    }

    /** Fetch the data from the server until it is there */
    protected async pollAllData<T>(procedure: ClientProcedure, transaction_id: string): Promise<T> {
        let trial = 0;
        while (trial++ < this.max_trials) {
            await promiseTimer(this.poll_interval_ms);
            try {
                const data = await this.fetchData(procedure, transaction_id);
                if (data.length > 0) {
                    return data;
                }
            } catch (e) {
                // try again
            }
        }
        throw new Error("Failed to get data");
    }

    /** Fetch the data from the server */
    protected fetchData(procedure: ClientProcedure, transaction_id: string) {
        const query_data = { mid: this.me.mid_b64, transaction_id };
        return axios.get(`${procedure.server.http_address}/data?${queryString(query_data)}`)
            .then((response) => response.data)
            .catch(this.logAxiosError.bind(this));
    }

    protected async requestAndAwaitAttestations(procedure: ClientProcedure) {
        const { attribute_names } = procedure.desc;
        const attestations: Attestation[] = [];
        for (const attr of attribute_names) {
            log(`> Requesting attestation of ${attr}.`);
            await this.requestAttestation(procedure, attr);
            const attestation = await this.awaitAttestation(procedure, attr);
            log(`> Attestation of ${attr} complete.`);
            attestations.push(attestation);
        }
        return attestations;
    }

    // protected async requestAllAttestations(procedure: ClientProcedure) {
    //     const { attribute_names } = procedure.desc;
    //     const promises = attribute_names.map((attr) => this.requestAttestation(procedure, attr));
    //     return Promise.all(promises);
    // }

    /** Request the attestation */
    protected async requestAttestation(procedure: ClientProcedure, attribute_name: string) {
        return this.api.requestAttestation(
            procedure.server.mid_b64,
            attribute_name,
            "id_metadata"
        );
    }

    protected async awaitAllAttestations(procedure: ClientProcedure): Promise<Dict<Attestation>> {
        const { attribute_names } = procedure.desc;
        const promises = attribute_names.map((attr) => this.awaitAttestation(procedure, attr));
        return Promise.all(promises).then((results: Attestation[]) =>
            results.reduce((map, r, i) => ({ ...map, [attribute_names[i]]: r }), {}));
    }

    /** Await the receipt of attestations */
    protected async awaitAttestation(procedure: ClientProcedure, attr_name: string): Promise<Attestation> {
        return new Promise((resolve) => {
            const sub = interval(1000).subscribe(() => {
                this.api.listAttestations().then((atts) => {
                    const att = atts.find((a) => a.attribute_name === attr_name);
                    if (att) {
                        sub.unsubscribe();
                        resolve(att);
                    }
                });
            });
        });
    }

    protected async requirePeer(mid_b64: string): Promise<boolean> {
        const peers = await this.api.listPeers();
        if (peers.indexOf(mid_b64) >= 0) {
            return true;
        } else {
            throw new Error(`Required peer ${mid_b64}, but is unknown!`);
        }
    }

    protected logAxiosError(error: AxiosError) {
        console.error("Request failed with status ",
            error.response.status, "and data", error.response.data);
        throw error;
    }

}
