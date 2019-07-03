import uuid = require("uuid/v4");
import { AttestationRequest } from "../ipv8/ipv8.api";
import { IPv8Service } from "../ipv8/ipv8.service";
import { Dict } from "../types/Dict";
import { Attribute, Credential, PeerId, ProcedureConfig } from "../types/types";

const log = console.log;

export class AttestationServer {

    private transactions: Dict<Transaction> = {};

    constructor(
        private ipv8service: IPv8Service
    ) {
        ipv8service.start();
    }

    /**
     * Initiate the transaction of a particular procedure with a peer.
     * @param procedure The procedure configuration
     * @param credentials The credential data provided by the peer
     * @param peer_id The peer's identity
     */
    public initiateTransaction(
        procedure: ProcedureConfig,
        credentials: Credential[],
        peer_id: PeerId
    ): string {
        const id = uuid();
        const t = new Transaction(id, this.ipv8service, procedure, credentials, peer_id);
        this.transactions[id] = t;
        t.initiate();
        return id;
    }

    public getData(transaction_id: string): Promise<Attribute[]> {
        return this.transactions[transaction_id]
            ? this.transactions[transaction_id].fetchAttributes()
            : Promise.reject(`ATT_SERV: No transaction exists with id ${transaction_id}.`);
    }

}

class Transaction {

    private verified = false;
    private completed = true;

    constructor(
        private id: string,
        private ipv8service: IPv8Service,
        private procedure: ProcedureConfig,
        private credentials: Credential[],
        private peerId: PeerId,
    ) {
        console.log(`ATT_SERV: Transaction #${id} has credentials: `, credentials);
        this.verified = credentials.length === 0;
    }

    public isComplete() {
        return this.completed;
    }

    public initiate() {
        console.log(`ATT_SERV: Transaction #${this.id}: initiating..`);
        this.verifyCredentialsIfRequired()
            .then((ok) => ok && this.attestToAttributes());
    }

    public fetchAttributes(): Promise<Attribute[]> {
        if (!this.verified) {
            return Promise.reject(`[ERROR] ATT_SERV: Transaction #${this.id}:
                Cannot fetch attributes before credential verified.`);
        } else {
            log(`Resolving, given credentials:`);
            log(JSON.stringify(this.credentials));
            return this.procedure.resolver(this.credentials);
        }
    }

    protected verifyCredentialsIfRequired(): Promise<boolean> {
        if (this.procedure.desc.requirements.length === 0) {
            console.log(`ATT_SERV: Transaction #${this.id}: No verification required.`);
            return Promise.resolve(true);
        } else {
            const promises = this.credentials.map((credential) => this.verifySingleCredential(credential));
            return Promise.all(promises)
                .then((ok: boolean[]) => {
                    this.verified = !ok.find((s) => !s);
                    return this.verified;
                })
                .catch(() => {
                    console.error(`[ERROR] ATT_SERV: Transaction #${this.id}: Credential verification failed`);
                    return false;
                });
        }
    }

    protected verifySingleCredential(credential: Credential) {
        console.log(`ATT_SERV: Transaction #${this.id}: `
            + `Awaiting verification of credential '${credential.attribute_hash}' `
            + `with value '${credential.attribute_value}'.`);

        return this.ipv8service.awaitVerification(
            this.peerId.mid_b64,
            this.peerId.mid_hex,
            credential.attribute_hash,
            credential.attribute_value
        );
    }

    protected attestToAttributes() {
        console.log(`ATT_SERV: Transaction #${this.id}: Awaiting attestation request(s).`);

        // TODO Multiple attributes
        this.ipv8service.awaitAttestationRequest(this.peerId.mid_b64).then((req) => {
            this.handleAttestationRequest(req);
        });
    }

    protected handleAttestationRequest(req: AttestationRequest) {
        console.log(`ATT_SERV: Transaction #${this.id}: Incoming attestation request.`);

        return this.fetchAttributes()
            .then((attributes) => {
                const attribute = attributes.find((a) => a.attribute_name === req.attribute_name);
                if (attribute) {
                    this.makeAttestation(attribute);
                }
            })
            .catch((e) => console.error(`[ERROR] ATT_SERV: Transaction #${this.id}: Could not fetch attributes.`));
    }

    protected makeAttestation(attribute: Attribute) {
        console.log(`ATT_SERV: Transaction #${this.id}: Making attestation` +
            ` of attribute '${attribute.attribute_name}'.`);
        const self = this;

        return this.ipv8service.attest(this.peerId.mid_b64, attribute.attribute_name, attribute.attribute_value)
            .then(() => { self.completed = true; })
            .catch((e) => console.error(`[ERROR] ATT_SERV: Transaction #${this.id}: Could not attest.`));
    }

}
