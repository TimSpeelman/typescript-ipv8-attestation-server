import uuid = require("uuid/v4");
import { IPv8Service } from "../ipv8/ipv8.service";
import { Dict } from "../types/Dict";
import { IAttesterService } from "../types/IAttesterService";
import { IVerifierService } from "../types/IVerifierService";
import { Attribute, Credential, PeerId, ProcedureConfig } from "../types/types";

const log = console.log;

export class AttestationServer {

    private transactions: Dict<Transaction> = {};

    constructor(
        private attesterService: IAttesterService,
        private verifierService: IVerifierService,
        private time: () => number,
        private options: AttestationServerOptions,
    ) { }

    /**
     * Initiate the transaction of a particular procedure with a peer.
     * @param procedure The procedure configuration
     * @param credentials The credential data provided by the peer
     * @param peer_id The peer's identity
     */
    public executeTransaction(
        procedure: ProcedureConfig,
        credentials: Credential[],
        peer_id: PeerId
    ): Promise<any> {
        const id = uuid().substr(0, 6);
        const t = new Transaction(
            id, this.attesterService,
            this.verifierService,
            procedure,
            credentials,
            peer_id,
            this.time,
            this.options);
        this.transactions[id] = t;
        return t.execute();
    }

    public getQueuedAttributes(mid_b64: string): Attribute[] {
        return this.attesterService.listStagedAttestations(mid_b64)
            .map((queued) => queued.attribute);
    }

}

class Transaction {

    constructor(
        private id: string,
        private attesterService: IAttesterService,
        private verifierService: IVerifierService,
        private procedure: ProcedureConfig,
        private credentials: Credential[],
        public peerId: PeerId,
        private time: () => number,
        private options: AttestationServerOptions,
    ) {
        console.log(`ATT_SERV: Transaction ${id} has credentials: `, credentials);
    }

    public execute(): Promise<any> {
        console.log(`ATT_SERV: Transaction ${this.id}: initiating..`);
        return this.verifyCredentialsIfRequired()
            .then((okay) => okay && this.grantAttestations());
    }

    public fetchAttributes(): Promise<Attribute[]> {
        return this.procedure.resolver(this.credentials);
    }

    protected verifyCredentialsIfRequired(): Promise<boolean> {
        return this.verifierService.verify(
            this.peerId.mid_b64,
            this.peerId.mid_hex,
            this.credentials,
            { maxAgeInSeconds: 60 },
        )
            .then(() => {
                console.log(`ATT_SERV: Transaction ${this.id}: Credentials verified.`);
                return true;
            })
            .catch(() => {
                console.error(`[ERROR] ATT_SERV: Transaction ${this.id}: Credential verification failed.`);
                return false;
            });
    }

    protected grantAttestations(): Promise<any> {
        return this.fetchAttributes().then((attributes) =>
            Promise.all(attributes.map((attribute) => {
                console.log(`ATT_SERV: Transaction ${this.id}: Granting attestation:`, attribute);
                const validUntil = this.time() + (1000 * this.options.attestationTimeoutInSeconds);
                return this.attesterService.stageAttestation(this.peerId.mid_b64, attribute, validUntil);
            })));
    }

}

export interface AttestationServerOptions {
    attestationTimeoutInSeconds: number;
}
