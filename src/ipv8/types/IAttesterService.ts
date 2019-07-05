import { Attribute } from "../../types/types";
import { AttestationRequest } from "../IPv8API";

/**
 * The AttesterService holds a list of granted attestations.
 * It listens for incoming attestation requests, and accepts
 * them when an attestation is granted, or calls an optional
 * callback otherwise.
 */
export interface IAttesterService {
    /** Grant the attestation of an attribute to a particular peer. */
    stageAttestation(mid_b64: string, attribute: Attribute, validUntil: number): void;
    /** List which attestations are still available. */
    listStagedAttestations(mid_b64: string): QueuedAttestation[];
    /** On a request which is not granted, call this callback. */
    onNonStagedRequest(callback: NonStagedRequestCallback): void;
}

export interface QueuedAttestation {
    attribute: Attribute;
    validUntil: number;
}

export type NonStagedRequestCallback = (request: AttestationRequest) => Promise<Attribute | null>;
