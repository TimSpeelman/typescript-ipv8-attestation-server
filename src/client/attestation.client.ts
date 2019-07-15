import axios from "axios";
import { Attestation, IPv8API } from "../ipv8/IPv8API";
import { Attribute } from "../ipv8/types/Attribute";
import { Dict } from "../ipv8/types/Dict";
import { IVerifieeService } from "../ipv8/types/IVerifieeService";
import { interval } from "../ipv8/util/interval";
import { AttributeDescription, ClientProcedure, Credential, PeerId } from "../types/types";
import { promiseTimer } from "../util/promiseTimer";
import { strlist } from "../util/strlist";
import { Validate } from "../util/validate";
import { APIClient } from "./apiClient";

export class AttestationClient {
    public config = {
        maxAttemptsToPollStagedAttributes: 20,
        pollStagedAttributesEveryMillis: 1000,
        pollAttestationRequestEveryMillis: 1000,
        allowVerificationTimeoutMillis: 10000,
    };

    constructor(
        private me: PeerId,
        private api: IPv8API,
        private verifeeService: IVerifieeService,
        private logger: (...args: any[]) => any = console.log,
    ) { }

    /**
     * Run an OWAttestationProcedure
     * @param procedure The procedure description
     * @param credential_values The values of all required credentials
     */
    public async execute(procedure: ClientProcedure, credential_values: Dict<string>) {
        const { desc, server } = procedure;
        this.log(`============= START =============`);
        this.log(`> Initiating attestation procedure '${desc.procedure_name}'`);
        this.log(`> Fetching required credentials: ${strlist(desc.requirements)}.`);
        const credentials = await this.fetchClientCredentialHashes(desc.requirements, credential_values);
        this.log(`> Initiating transaction..`);
        await this.sendAttestationRequestToServer(procedure, credentials);
        this.log(`> Awaiting verification of credentials..`);
        const verificationValidUntil = Date.now() + this.config.allowVerificationTimeoutMillis;
        await this.verifeeService.stageVerification(server.mid_b64, desc.requirements, verificationValidUntil);
        this.log(`> Polling server for attributes..`);
        const data = await this.pollServerForAttributeValues(procedure);
        this.log(`> Data received from server:`);
        this.log(data);
        this.log(`> Requesting attestations of attributes: ${strlist(desc.attributes.map((a) => a.name))}..`);
        const attestations = await this.requestAndAwaitAttestations(procedure);
        this.log("> Attestations received: ");
        this.log(attestations);
        this.log(`=========== COMPLETE ============`);

        return {
            data,
            attestations
        };
    }

    public log(...args: any[]) {
        if (this.logger) { this.logger(...args); }
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
    protected sendAttestationRequestToServer(procedure: ClientProcedure, credentials: Credential[]): Promise<void> {
        const request = {
            procedure_id: procedure.desc.procedure_name,
            mid_hex: this.me.mid_hex,
            mid_b64: this.me.mid_b64,
            credentials,
        };
        return new APIClient(axios, procedure.server.http_address).initiate(request);
    }

    /**
     * Fetches a list of attributes that the OWAttestationServer has staged for attestation.
     * This could contain more than the attributes for this procedure, hence we wait for the
     * desired names.
     */
    protected async pollServerForAttributeValues(procedure: ClientProcedure): Promise<Attribute[]> {
        let attempt = 0;

        while (attempt++ < this.config.maxAttemptsToPollStagedAttributes) {
            const api = new APIClient(axios, procedure.server.http_address);
            const response: any = await api.staged({ mid: this.me.mid_b64 });
            const data = this.parseReceivedDataOrThrow(response);
            const desiredNames = procedure.desc.attributes.map((a) => a.name);
            const desiredData = data.filter((d) => desiredNames.indexOf(d.attribute_name) >= 0);
            if (desiredData.length === desiredNames.length) {
                return desiredData;
            }
            await promiseTimer(this.config.pollStagedAttributesEveryMillis);
        }
        throw new Error("Server did not provide attribute values.");
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
        const { attributes: attribute_names } = procedure.desc;
        const attestations: Attestation[] = [];
        for (const attribute of attribute_names) {
            this.log(`> Requesting attestation of ${attribute}.`);
            await this.requestAttestation(procedure, attribute);
            const attestation = await this.awaitAttestation(attribute.name);
            this.log(`> Attestation of ${attribute} complete.`);
            attestations.push(attestation);
        }
        return attestations;
    }

    /** Request the attestation */
    protected async requestAttestation(procedure: ClientProcedure, attribute: AttributeDescription) {
        return this.api.requestAttestation(
            procedure.server.mid_b64,
            attribute.name,
            attribute.type,
        );
    }

    protected async awaitAllAttestations(procedure: ClientProcedure): Promise<Dict<Attestation>> {
        const { attributes } = procedure.desc;
        const promises = attributes.map((attr) => this.awaitAttestation(attr.name));
        return Promise.all(promises).then((results: Attestation[]) =>
            results.reduce((map, r, i) => ({ ...map, [attributes[i].name]: r }), {}));
    }

    /** Await the receipt of attestations */
    protected async awaitAttestation(attr_name: string): Promise<Attestation> {
        return new Promise((resolve) => {
            const sub = interval(this.config.pollAttestationRequestEveryMillis).subscribe(() => {
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

}
