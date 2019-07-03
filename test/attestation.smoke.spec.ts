import chai from "chai";
import { describe, it } from "mocha";
import sinon from "sinon";
import { IPv8Service } from "../src/ipv8/ipv8.service";
import { AttestationServer } from "../src/server/attestation.server";
import { Database } from "../src/server/database";
import { MockIPv8API } from "./util/mock-api";
const expect = chai.expect;

describe("Attestation Transaction", function () {

    it("works", function (done) {
        const client_bsn = "bsn1";
        const client_mid = "mid1";
        const expected_kvknr = "kvk1";

        const mockApi = new MockIPv8API([client_mid]);
        mockApi.attest = sinon.spy();
        const db = new Database({ [client_bsn]: expected_kvknr });
        // @ts-ignore
        const service = new IPv8Service(mockApi);
        const server = new AttestationServer(service, db);

        // Client initiates the transaction (over HTTP)
        server.executeTransaction(client_bsn, client_mid)
            .then(() => {
                // We expect that the peer receives a BSN verification request
                // We expect that the peer accepts the verification: see mock.
                // Here: client has verified

                // Client then asks for the data (over HTTP)
                server.getQueuedAttributes(client_mid)
                    .then((kvknr) => {
                        expect(kvknr).to.equal(expected_kvknr);

                        // We expect the peer to require attestation of the kvknr attribute
                        // We expect the server answers the attestation: see mock
                        setTimeout(() => {
                            expect(mockApi.attest).to.have.property("calledOnce", true);
                        }, 2000);

                    }).catch(done);

            })
            .catch(done);

    });

});
