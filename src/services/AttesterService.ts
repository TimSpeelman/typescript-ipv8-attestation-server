import { AttestationRequest } from "../ipv8/ipv8.api";
import { IPv8Service } from "../ipv8/ipv8.service";
import { Dict } from "../types/Dict";
import { IAttesterService, NonStagedRequestCallback, QueuedAttestation } from "../types/IAttesterService";
import { Attribute } from "../types/types";

export class AttesterService implements IAttesterService {

    private queue: Dict<Dict<QueuedAttestation>> = {};
    private listeners: NonStagedRequestCallback[] = [];

    constructor(private ipv8service: IPv8Service, private time: () => number) {
        this.awaitLoop();
    }

    public stageAttestation(mid_b64: string, attribute: Attribute, validUntil: number): void {
        this.put(mid_b64, { attribute, validUntil });
    }

    public listStagedAttestations(mid_b64: string): QueuedAttestation[] {
        this.removeInvalid(mid_b64);
        return this.get(mid_b64);
    }

    public onNonStagedRequest(callback: NonStagedRequestCallback): void {
        this.listeners.push(callback);
    }

    /** Check for a valid attestation in the queue, then attest and remove it. */
    protected async onAttestationRequest(req: AttestationRequest): Promise<any> {
        const { mid_b64, attribute_name } = req;
        const att = this.getIfValid(mid_b64, attribute_name);
        if (!att) {
            this.handleNonStagedRequest(req);
        } else {
            await this.ipv8service.attest(mid_b64, attribute_name, att.attribute.attribute_value);
            this.remove(mid_b64, attribute_name);
        }
    }

    protected handleNonStagedRequest(req: AttestationRequest): void {
        this.listeners.forEach((listener) => listener(req));
    }

    protected awaitLoop() {
        this.ipv8service.awaitAttestationRequest("*")
            .then((req) => {
                // Note that this may feed the same request into the system
                // multiple times, until it is resolved!
                this.onAttestationRequest(req);
                this.awaitLoop();
            });
    }

    protected getIfValid(mid_b64: string, attribute_name: string): QueuedAttestation | null {
        this.removeInvalid(mid_b64);
        return this.get(mid_b64)
            .find((i) => i.attribute.attribute_name === attribute_name);
    }

    protected get(mid_b64: string): QueuedAttestation[] {
        return Object.values(this.queue[mid_b64] || {});
    }

    protected remove(mid_b64: string, attribute_name: string) {
        const items = this.queue[mid_b64];
        delete items[attribute_name];
    }

    protected put(mid_b64: string, item: QueuedAttestation) {
        if (!this.queue[mid_b64]) {
            this.queue[mid_b64] = {};
        }
        this.queue[mid_b64][item.attribute.attribute_name] = item;
    }

    protected removeInvalid(mid_b64: string) {
        const items = this.get(mid_b64);
        items
            .filter((a) => a.validUntil < this.time())
            .forEach((a) => this.remove(mid_b64, a.attribute.attribute_name));
    }

}
