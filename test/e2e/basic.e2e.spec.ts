import { AttestationClient } from "../../src/client/attestation.client";
import { clientPeer, serverPeer } from "../../src/example/config";
import { AttesterService } from "../../src/ipv8/AttesterService";
import { IPv8API } from "../../src/ipv8/IPv8API";
import { IPv8Service } from "../../src/ipv8/IPv8Service";
import { Attribute } from "../../src/ipv8/types/Attribute";
import { Dict } from "../../src/ipv8/types/Dict";
import { VerifieeService } from "../../src/ipv8/VerifieeService";
import { VerifierService } from "../../src/ipv8/VerifierService";
import { AttestationServer } from "../../src/server/attestation.server";
import { HttpAttestationServer } from "../../src/server/http.server";
import { ClientProcedure, ProcedureConfig } from "../../src/types/types";
import { describe, expect, it } from "../tools";

const ATT_ZERO = "att0";
const ATT_ZERO_VAL = "att0val";

const config = {
    procedureZero: {
        procedure_name: "procedureZero",
        attributes: [{ name: ATT_ZERO, type: "id_metadata" }],
        requirements: [] as string[],
    },
    zeroResolver: () => Promise.resolve([{
        attribute_name: ATT_ZERO,
        attribute_value: ATT_ZERO_VAL,
    }]),
};

describe("Basic Client-Server Attestation without verification", function () {

    it("attests without verification if not required", async function () {
        const server = mockAttestationServer();
        const client = mockAttestationClient();
        const procedure: ClientProcedure = {
            server: {
                http_address: "http://localhost:" + serverPeer.rest_port,
                mid_b64: serverPeer.mid_b64,
            },
            desc: config.procedureZero,
        };
        const myAttrs = {};
        const { data, attestations } = await executeProcedureFromClient(client, procedure, myAttrs);
        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("attribute_name", ATT_ZERO);
        expect(data[0]).to.have.property("attribute_value", ATT_ZERO_VAL);

        expect(attestations).to.be.an("array");
        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", ATT_ZERO);
        expect(attestations[0]).to.have.property("signer_mid_64", serverPeer.mid_b64);
        console.log(attestations[0]);
    });

});

function mockAttestationClient() {
    const time = Date.now;
    const api = new IPv8API(clientPeer.ipv8_url);
    const verifieeService = new VerifieeService(api, time);
    return new AttestationClient(
        {
            mid_hex: clientPeer.mid_hex,
            mid_b64: clientPeer.mid_b64,
        },
        api,
        verifieeService
    );
}

function executeProcedureFromClient(
    attClient: AttestationClient,
    procedure: ClientProcedure,
    clientAttributeStore: Dict<any>
) {
    return attClient.execute(procedure, clientAttributeStore)
        .then(({ data, attestations }) => {
            data.forEach((attr: Attribute) => {
                // @ts-ignore
                clientAttributeStore[attr.attribute_name] = attr.attribute_value;
            });
            return { data, attestations };
        });
}

function mockAttestationServer() {
    const time = Date.now;
    const api = new IPv8API(serverPeer.ipv8_url);
    const service = new IPv8Service(api);
    const attesterService = new AttesterService(service, time);
    const verifierService = new VerifierService(service, time);
    const attServ = new AttestationServer(attesterService, verifierService, time, { attestationTimeoutInSeconds: 60 });

    const procedureConfiguration: Dict<ProcedureConfig> = {
        procedureZero: {
            desc: config.procedureZero,
            resolver: config.zeroResolver,
        },
    };
    const httpServer = new HttpAttestationServer(procedureConfiguration, attServ, serverPeer.rest_port);

    // Need to start polling
    service.start();
    httpServer.start();
}
