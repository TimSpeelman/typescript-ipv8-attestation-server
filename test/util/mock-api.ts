import _ from "lodash";

export class MockIPv8API {

    constructor(private peers: string[]) { }

    /** Make sure we look for a particular peer */
    public connectPeer(mid_hex: string): Promise<Peer[]> {
        this.peers.push(mid_hex);
        return Promise.resolve([{public_key: "pubkeytest", address: ["iptest", 42]}]);
    }

    /** Get the list of discovered peers */
    public listPeers(): Promise<string[]> {
        return Promise.resolve(this.peers);
    }

    /** Request a verification */
    public requestVerification(
        mid_b64: string,
        attribute_hash_b64: string,
        attribute_value: string,
        id_format: string = "id_metadata",
        id_metadata_obj: any = null,
    ): Promise<boolean> {
        return Promise.resolve(true);
    }

    public getVerificationRequests(): Promise<any> { // FIXME type
        return Promise.resolve([]);
    }

    public listVerificationOutputs(): Promise<VerificationOutputs> {
        return Promise.resolve([{}]);
    }

    public listAttestationRequests(): Promise<Array<unknown>> {
        return Promise.resolve([]);
    }

    public listAttestations(): Promise<any> {
        return Promise.resolve([]);
    }

    public attest(
        mid_b64: string,
        attribute_name: string,
        attribute_value: string,
    ): Promise<any> {
        return Promise.resolve(true);
    }

    public requestAttestation(
        mid_b64: string,
        attribute_name: string,
        id_format: string,
    ): Promise<boolean> {
        return Promise.resolve(true);
    }

}

export interface IPv8AttestationRequest {
    mid_b64: string;
    attribute_name: string;
    metadata: string;
}

export interface IPv8AttestationMetadata {
    provider: string;
    option: string;
}

export interface Peer {
    public_key: string;
    address: [string, number];
}

export interface GetPeersResponse {
    // TODO
}
interface VerificationRequest {

}
export interface VerificationOutputs {
    [keyIdontKnow: string]: [{ valueHash: string, probability: number }];
}
