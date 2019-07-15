import axios, { AxiosError } from "axios";
import { Attestation, IPv8API } from "../ipv8/IPv8API";
import { Attribute } from "../ipv8/types/Attribute";
import { Dict } from "../ipv8/types/Dict";
import { IVerifieeService } from "../ipv8/types/IVerifieeService";
import { interval } from "../ipv8/util/interval";
import { queryString } from "../ipv8/util/queryString";
import { ClientProcedure, Credential, PeerId } from "../types/types";
import { promiseTimer } from "../util/promiseTimer";
import { strlist } from "../util/strlist";
import { Validate } from "../util/validate";

const log = console.log;

export class AttestationClient {
    public max_attempts: number = 20;
    public poll_interval_ms: number = 1000;
    constructor(
        private me: PeerId,
        private api: IPv8API,
        private verifeeService: IVerifieeService,
    ) { }

    /**
     * Run an OWAttestationProcedure
     * @param procedure The procedure description
     * @param credential_values The values of all required credentials
     */
    public async execute(procedure: ClientProcedure, credential_values: Dict<string>) {
        const { desc } = procedure;
        log(`============= START =============`);
        log(`> Initiating attestation procedure '${procedure.desc.procedure_name}'`);
        log(`> Fetching required credentials: ${strlist(desc.requirements)}.`);
        const credentials = await this.fetchClientCredentialHashes(desc.requirements, credential_values);
        log(`> Initiating transaction..`);
        const transaction_id = await this.sendAttestationRequestToServer(procedure, credentials);
        log(`> Awaiting verification of credentials..`);
        await this.verifeeService.stageVerification(
            procedure.server.mid_b64, desc.requirements, Date.now() + 10000);
        log(`> Polling server for attributes..`);
        const data = await this.pollServerForAttributeValues(procedure);
        log(`> Data received from server:`);
        log(data);
        log(`> Requesting attestations of attributes: ${strlist(desc.attribute_names)}..`);
        const attestations = await this.requestAndAwaitAttestations(procedure);
        log("> Attestations received: ");
        log(attestations);
        log(`=========== COMPLETE ============`);

        return {
            data,
            attestations
        };
    }

    /** Fetch the hashes belonging to specific attributes. */
    protected fetchClientCredentialHashes(credential_names: string[], values: Dict<string>): Promise<Credential[]> {
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
            throw new Error(`Missing hash for attribute ${attribute_name}.`);
        }
        return attestation.attribute_hash;
    }

    /**
     * Request the OWAttestationServer to stage our attributes and
     * verify our credentials if needed, passing the credential data.
     */
    protected sendAttestationRequestToServer(procedure: ClientProcedure, credentials: Credential[]): Promise<string> {
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

    /** Wait for the server to offer the desired attributes. */
    protected async pollServerForAttributeValues(procedure: ClientProcedure): Promise<Attribute[]> {
        let attempt = 0;

        while (attempt++ < this.max_attempts) {
            const response: any = await this.fetchStagedAttributesFromServer(procedure.server.http_address);
            const data = this.parseReceivedDataOrThrow(response);
            const desiredNames = procedure.desc.attribute_names;
            const desiredData = data.filter((d) => desiredNames.indexOf(d.attribute_name) >= 0);
            if (desiredData.length === desiredNames.length) {
                return desiredData;
            }
            await promiseTimer(this.poll_interval_ms);
        }
        throw new Error("Server did not provide attribute values.");
    }

    /**
     * Fetches a list of attributes that the OWAttestationServer has staged for attestation.
     * This could contain more than the attributes for this procedure.
     */
    protected fetchStagedAttributesFromServer(server_http_address: string) {
        const query_data = { mid: this.me.mid_b64 };
        return axios.get(`${server_http_address}/data?${queryString(query_data)}`)
            .then((response) => response.data)
            .catch(this.logAxiosError.bind(this));
    }

    /**
     * We don't trust the data provided by the server. Hence first validate it, and then
     * only grab the expected parts.
     */
    protected parseReceivedDataOrThrow(receivedData: any): Attribute[] {
        const { arrayWithEach, many, hasKey } = Validate;
        const validator = arrayWithEach(many([
            hasKey("attribute_name"),
            hasKey("attribute_value"),
        ]));
        const error = validator(receivedData);
        if (error !== false) {
            throw new Error(`Server response malformed: ${error}.`);
        }
        const array: Attribute[] = receivedData;
        return array.map((val) => ({
            attribute_name: val.attribute_name,
            attribute_value: val.attribute_value,
        }));
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
