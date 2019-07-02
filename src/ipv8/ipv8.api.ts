import axios, { AxiosError } from "axios";
import _ from "lodash";
import { b64encode } from "../util/b64";
import { queryString } from "../util/queryString";

export class IPv8API {

    constructor(private api_base: string) { }

    /** Make sure we look for a particular peer */
    public connectPeer(mid_hex: string): Promise<Peer[]> {
        return axios.get(this.api_base + `/dht/peers/${mid_hex}`)
            .then((response: any) => response.data.peers)
            .catch(this.handleError.bind(this));
    }

    /** Get the list of discovered peers */
    public listPeers(): Promise<string[]> {
        return axios.get(this.api_base + "/attestation?type=peers").then((res) => res.data)
            .catch(this.handleError.bind(this));
    }

    /** Request a verification */
    public requestVerification(
        mid_b64: string,
        attribute_hash_b64: string,
        attribute_value: string,
        id_format: string = "id_metadata",
        id_metadata_obj: any = null,
    ): Promise<boolean> {
        const query = {
            type: "verify",
            mid: mid_b64,
            attribute_hash: attribute_hash_b64,
            attribute_values: b64encode(attribute_value),
            id_format,
            id_metadata: b64encode(JSON.stringify(id_metadata_obj)),
        };
        return axios.post(this.api_base + `/attestation?${queryString(query)}`, "")
            .then((response) => response.data.success)
            .catch(this.handleError.bind(this));
    }

    /** Allow a peer to verify a particular attribute */
    public allowVerify(mid_b64: string, attribute_name: string): Promise<boolean> {
        const query = { type: "allow_verify", mid: mid_b64, attribute_name };
        return axios.post(this.api_base + `/attestation?${queryString(query)}`)
            .then((res) => res.data.success)
            .catch(this.handleError.bind(this));
    }

    /** Get all outstanding verification requests from peers */
    public listVerificationRequests(): Promise<VerificationRequest[]> {
        return axios.get(this.api_base + "/attestation?type=outstanding_verify")
            .then((res) => res.data.map(([mid_b64, attribute_name]: string[]) => ({ mid_b64, attribute_name })))
            .catch(this.handleError.bind(this));
    }

    /** List all verification outputs (pending and completed) */
    public listVerificationOutputs(): Promise<VerificationOutputMap> {
        return axios.get(this.api_base + "/attestation?type=verification_output")
            .then((res) => _.mapValues(res.data, (pairs) => pairs.map(
                ([value_hash, probability]: [string, number]) => ({ value_hash, probability }))))
            .catch(this.handleError.bind(this));
    }

    /** List all oustanding attestation requests */
    public listAttestationRequests(): Promise<AttestationRequest[]> {
        return axios.get(this.api_base + "/attestation?type=outstanding")
            .then((res) => res.data.map(
                ([mid_b64, attribute_name, metadata]: string[]) => ({ mid_b64, attribute_name, metadata })
            ))
            .catch(this.handleError.bind(this));
    }

    /** List all created attestations */
    public listAttestations(): Promise<Attestation[]> {
        return axios.get(this.api_base + "/attestation?type=attributes")
            .then((res) => res.data.map(
                ([attribute_name, attribute_hash, metadata, signer_mid_64]: string[]): Attestation =>
                    ({ attribute_name, attribute_hash, metadata, signer_mid_64 })))
            .catch(this.handleError.bind(this));
    }

    /** Make an attestation */
    public attest(
        mid_b64: string,
        attribute_name: string,
        attribute_value: string,
    ): Promise<any> {
        const query = {
            type: "attest",
            mid: mid_b64,
            attribute_name,
            attribute_value: b64encode(attribute_value),
        };
        return axios.post(this.api_base + `/attestation?${queryString(query)}`)
            .then((res) => res.data)
            .catch(this.handleError.bind(this));
    }

    /** Request an attestation */
    public requestAttestation(
        mid_b64: string,
        attribute_name: string,
        id_format: string,
    ): Promise<boolean> {
        const query = {
            type: "request",
            mid: mid_b64,
            attribute_name,
            id_format
        };
        return axios.post(this.api_base + `/attestation?${queryString(query)}`)
            .then((res) => res.data.success)
            .catch(this.handleError.bind(this));
    }

    protected handleError(res: AxiosError) {
        console.error("Api Error", {
            path: res.request.path,
            status: res.response.status,
            message: res.response.data.error.message
        });
        throw res;
    }

}

export interface Attestation {
    attribute_name: string;
    attribute_hash: string;
    metadata: any;
    signer_mid_64: string;
}

export interface AttestationRequest {
    mid_b64: string;
    attribute_name: string;
    metadata: string;
}

export interface AttestationMetadata {
    provider: string;
    option: string;
}

export interface Peer {
    public_key: string;
    address: [string, number];
}

export interface VerificationRequest {
    mid_b64: string;
    attribute_name: string;
}

export interface VerificationOutputMap {
    [attribute_hash: string]: VerificationOutput[];
}

export interface VerificationOutput {
    value_hash: string;
    probability: number;
}
