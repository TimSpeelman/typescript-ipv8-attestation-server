import { IPv8Service } from "./IPv8Service";
import { AttributeWithHash } from "./types/Attribute";
import { Dict } from "./types/Dict";
import { IVerifierService, VerifyOptions } from "./types/IVerifierService";

const log = console.log;

export class VerifierService implements IVerifierService {

    private verified: Dict<VerificationRecord[]> = {};

    constructor(private ipv8service: IPv8Service, private time: () => number) { }

    public verify(
        mid_b64: string, mid_hex: string, credentials: AttributeWithHash[], options?: VerifyOptions): Promise<boolean> {

        return Promise.all(credentials.map((c) => this.verifySingle(mid_b64, mid_hex, c, options)))
            .then((oks) => !oks.some((ok) => !ok));
    }

    protected verifySingle(
        mid_b64: string, mid_hex: string, credential: AttributeWithHash, options?: VerifyOptions): Promise<boolean> {

        const record: VerificationRecord = { credential, requestedAtTime: this.time() };
        this.put(mid_b64, record);

        return this.ipv8service.awaitVerification(mid_b64, mid_hex,
            credential.attribute_hash, credential.attribute_value)
            .then((ok) => {
                log("Verification of", credential.attribute_name, "of peer",
                    mid_b64, "resulted in", ok);

                if (ok) {
                    record.verifiedAtTime = this.time();
                }
                return ok;
            });
    }

    protected isVerified(mid_b64: string, credential: AttributeWithHash, maxAgeInSeconds: number): boolean {
        const record = this.get(mid_b64).find((rec) => rec.credential.attribute_hash === credential.attribute_hash);
        const minTime = this.time() - maxAgeInSeconds;
        return record && record.verifiedAtTime && record.verifiedAtTime > minTime;
    }

    protected get(mid_b64: string) {
        return this.verified[mid_b64] || [];
    }

    protected put(mid_b64: string, record: VerificationRecord) {
        if (!this.verified[mid_b64]) {
            this.verified[mid_b64] = [];
        }
        this.verified[mid_b64].push(record);
    }

}

interface VerificationRecord {
    credential: AttributeWithHash;
    requestedAtTime: number;
    verifiedAtTime?: number;
}
