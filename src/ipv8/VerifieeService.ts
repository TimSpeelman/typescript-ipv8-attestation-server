import { IPv8API, VerificationRequest } from "./IPv8API";
import { Dict } from "./types/Dict";
import { IVerifieeService, NonStagedRequestCallback } from "./types/IVerifieeService";
import { interval } from "./util/interval";

const log = console.log;

export class VerifieeService implements IVerifieeService {

    private stage: Dict<Dict<VerificationGrant>> = {};
    private listener: NonStagedRequestCallback = null;

    constructor(
        private api: IPv8API,
        private time: () => number) {
        this.awaitLoop();
    }

    public stageVerification(mid_b64: string, attribute_names: string[], validUntil: number): Promise<any> {
        return Promise.all(attribute_names.map((attr) => this.stageSingle(mid_b64, attr, validUntil)));
    }

    public onNonStagedRequest(callback: NonStagedRequestCallback): void {
        this.listener = callback;
    }

    protected stageSingle(mid_b64: string, attribute_name: string, validUntil: number): Promise<void> {
        return new Promise((resolve) => {
            this.put(mid_b64, { mid_b64, attribute_name, validUntil, callback: resolve });
        });
    }

    /** Check for a valid attestation in the queue, then attest and remove it. */
    protected async onVerificationRequest(req: VerificationRequest): Promise<any> {
        const { mid_b64, attribute_name } = req;
        const att = this.getIfValid(mid_b64, attribute_name);
        if (!att) {
            const ok = await this.handleNonStagedRequest(req);
            if (!ok ) {
                return false;
            }
        } else {
            await this.requirePeer(mid_b64);
            await this.api.allowVerify(mid_b64, attribute_name);
            att.callback();
            // this.remove(mid_b64, attribute_name);
        }
    }

    protected handleNonStagedRequest(req: VerificationRequest): Promise<boolean> {
        return this.listener ? this.listener(req) : Promise.resolve(false);
    }

    protected awaitLoop() {
        interval(1000).subscribe(() => {
            this.api.listVerificationRequests().then(async (requests) => {
                requests.forEach((req) => {
                    // Note that this may feed the same request into the system
                    // multiple times, until it is resolved!
                    this.onVerificationRequest(req);
                });
            });
        });
    }

    protected getIfValid(mid_b64: string, attribute_name: string): VerificationGrant | null {
        this.removeInvalid(mid_b64);
        return this.get(mid_b64)
            .find((i) => i.attribute_name === attribute_name);
    }

    protected get(mid_b64: string): VerificationGrant[] {
        return Object.values(this.stage[mid_b64] || {});
    }

    protected remove(mid_b64: string, attribute_name: string) {
        const items = this.stage[mid_b64];
        delete items[attribute_name];
    }

    protected put(mid_b64: string, item: VerificationGrant) {
        if (!this.stage[mid_b64]) {
            this.stage[mid_b64] = {};
        }
        this.stage[mid_b64][item.attribute_name] = item;
    }

    protected removeInvalid(mid_b64: string) {
        const items = this.get(mid_b64);
        items
            .filter((a) => a.validUntil < this.time())
            .forEach((a) => this.remove(mid_b64, a.attribute_name));
    }

    protected async requirePeer(mid_b64: string): Promise<boolean> {
        const peers = await this.api.listPeers();
        if (peers.indexOf(mid_b64) >= 0) {
            return true;
        } else {
            throw new Error(`Required peer ${mid_b64}, but is unknown!`);
        }
    }

}

interface VerificationGrant {
    mid_b64: string;
    attribute_name: string;
    validUntil: number;
    callback: () => void;
}
