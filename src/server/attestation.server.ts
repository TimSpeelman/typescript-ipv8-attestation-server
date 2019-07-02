import uuid = require("uuid/v4");
import { IPv8Service } from "../ipv8/ipv8.service";
import { Dict } from "../types/Dict";
import { Database } from "./database";

interface Credential {
    attribute_value: string;
    attribute_hash: string;
}

interface PeerId {
    mid_b64: string;
    mid_hex: string;
}

export class AttestationServer {

    private transactions: Dict<Transaction> = {};

    constructor(private ipv8service: IPv8Service, private db: Database) {
        ipv8service.start();
    }

    public initiateTransaction(credentials: Credential, peer_id: PeerId) {
        const t = new Transaction(this.ipv8service, credentials, peer_id, this.db);
        const promise = t.initiate();
        this.transactions[peer_id.mid_b64] = t;
        return promise;
    }

    public getData(mid: string): Promise<string> {
        return this.transactions[mid]
            ? this.transactions[mid].fetchAttributes()
            : Promise.reject(`No transaction exists for mid ${mid}.`);
    }

}

class Transaction {

    private id = uuid();
    private verified = false;
    private completed = true;
    private attr_name = "kvknr";

    constructor(
        private ipv8service: IPv8Service,
        private credentials: Credential,
        private peerId: PeerId,
        private db: Database,
    ) { }

    public isComplete() {
        return this.completed;
    }

    public initiate() {
        console.log(`INFO: Transaction #${this.id}: initiating..`);
        return this.ipv8service.awaitVerification(
            this.peerId.mid_b64,
            this.peerId.mid_hex,
            this.credentials.attribute_hash,
            this.credentials.attribute_value
        )
            .then((ok) => this.handleVerificationResult(ok))
            .catch(() => console.error(`ERROR: Transaction #${this.id}: Credential verification failed`));
    }

    public handleVerificationResult(success: boolean) {
        console.log(`INFO: Transaction #${this.id}: Credential verification result:`, success);
        this.verified = success;
        this.ipv8service.awaitAttestationRequest(this.peerId.mid_b64).then((req) => {
            this.handleAttestationRequest();
        });
    }

    public fetchAttributes(): Promise<string> {
        if (!this.verified) {
            return Promise.reject(`ERROR: Transaction #${this.id}: `
                + `Cannot fetch attributes before credential verified.`);
        } else {
            return this.db.get(this.credentials.attribute_value);
        }
    }

    public handleAttestationRequest() {
        console.log(`INFO: Transaction #${this.id}: Incoming attestation request.`);
        return this.fetchAttributes()
            .then((value) => { this.makeAttestation(value); })
            .catch((e) => console.error(`ERROR: Transaction #${this.id}: Could not fetch attributes.`));
    }

    public makeAttestation(value: string) {
        console.log(`INFO: Transaction #${this.id}: Making attestation.`);
        const self = this;
        return this.ipv8service.attest(this.peerId.mid_b64, this.attr_name, value)
            .then(() => { self.completed = true; })
            .catch((e) => console.error(`ERROR: Transaction #${this.id}: Could not attest.`));
    }

}
