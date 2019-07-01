import { interval, Subscription } from "rxjs";
import { CallbackDict } from "../util/CallbackDict";
import { IPv8API, VerificationOutputMap } from "./ipv8.api";

export class IPv8Service {

    private connectionCallbacks = new CallbackDict<(b: boolean) => void>();
    private verificationCallbacks = new CallbackDict<(b: any) => void>();
    private attestationRequestCallbacks = new CallbackDict<(b: boolean) => void>();

    private peers: string[] = [];
    private interval: Subscription;

    constructor(private api: IPv8API) { }

    public start() {
        this.interval = interval(1000).subscribe(() => {
            this.pollAttestationRequests();
            this.pollVerificationOutputs();
            this.pollPeers();
        });
    }

    public stop() {
        if (this.interval) {
            this.interval.unsubscribe();
        }
    }

    /** Promises a boolean, true when the peer is found, or false when time runs out. */
    public awaitConnection(mid_b64: string, mid_hex: string): Promise<any> {
        console.log(`Looking for ${mid_b64} (hex: ${mid_hex})`);

        if (this.peers.indexOf(mid_b64) >= 0) {
            return Promise.resolve(true);
        } else {
            return this.api.connectPeer(mid_hex)
                .then(() => {
                    console.log(`Peer ${mid_b64} found!`);

                    return true;
                })
                .catch(console.error);
        }
    }

    /** Promises a boolean, true when the given attribute is verified, false if not. */
    public awaitVerification(
        mid_b64: string,
        mid_hex: string,
        attribute_hash_b64: string,
        attribute_value: string): Promise<boolean> {

        return this.awaitConnection(mid_b64, mid_hex)
            .then(() => {
                console.log(`Requesting verification from ${mid_b64}.`);
                this.api.requestVerification(mid_b64, attribute_hash_b64, attribute_value);
                return new Promise<boolean>((resolve) => {
                    this.verificationCallbacks.register(attribute_hash_b64, resolve);
                }).then((answer) => {
                    console.log(`Verification received from ${mid_b64}:`, answer);
                    return answer;
                });
            });
    }

    /** Promises an attestation request for a given mid */
    public awaitAttestationRequest(mid_b64: string): Promise<boolean> {
        return new Promise((resolve) => this.attestationRequestCallbacks.register(mid_b64, resolve));
    }

    /** Attempts to make an attestation */
    public attest(mid_b64: string, attribute_name: string, attribute_value: string): Promise<boolean> {
        return this.api.attest(mid_b64, attribute_name, attribute_value);
    }

    protected pollPeers() {
        return this.api.listPeers()
            .then((results) => this.handleNewPeers(results));
    }

    protected handleNewPeers(peers: string[]) {
        this.peers = peers;
        peers.forEach((peer) => this.connectionCallbacks.call(peer)(true));
    }

    protected pollVerificationOutputs() {
        return this.api.listVerificationOutputs()
            .then((results) => this.handleVerificationOutputs(results));
    }

    protected handleVerificationOutputs(results: VerificationOutputMap) {
        Object.entries(results)
            .forEach(([attribute_hash, value]) =>
                (value[0].probability > 0.5) // FIXME?
                    ? this.verificationCallbacks.call(attribute_hash)(true) : null); // Note, should only call once!
    }

    protected pollAttestationRequests() {
        return this.api.listAttestationRequests()
            .then((requests) => this.handleAttestationRequests(requests));
    }

    protected handleAttestationRequests(requests: any[]) {
        requests.forEach((result) => this.attestationRequestCallbacks.call(result.mid)(result));
    }

}
