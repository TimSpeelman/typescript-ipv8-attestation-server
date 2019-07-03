import { Credential } from "./types";

/**
 * The VerifierService verifies attributes through IPv8 and
 * caches the results.
 */
export interface IVerifierService {
    /** Verify n attributes of a peer, or allow a cached verification of a specific age */
    verify(
        mid_b64: string,
        mid_hex: string,
        credentials: Credential[],
        options?: VerifyOptions
    ): Promise<boolean>;
}

export interface VerifyOptions {
    maxAgeInSeconds?: number;
    timeout?: number;
}
