import { AttestationClientFactory } from "../../src/client/AttestationClientFactory";
import { AttestationClient } from "../../src/client/AttestationClientRunner";
import { clientPeer, serverPeer } from "../../src/example/config";
import { Attribute } from "../../src/ipv8/types/Attribute";
import { Dict } from "../../src/ipv8/types/Dict";
import { AttestationServer } from "../../src/server/AttestationServer";
import { ClientProcedure, ProcedureConfig } from "../../src/types/types";
import { describe, expect, it } from "../tools";

const ATT_ZERO = "att0";
const ATT_ZERO_VAL = "att0val";
const ATT_ONE = "att1";
const ATT_ONE_VAL = "att1val";

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
    procedureOne: {
        procedure_name: "procedureOne",
        attributes: [{ name: ATT_ONE, type: "id_metadata" }],
        requirements: [ATT_ZERO] as string[],
    },
    OneResolver: () => Promise.resolve([{
        attribute_name: ATT_ONE,
        attribute_value: ATT_ONE_VAL,
    }]),
};

const serverId = {
    http_address: "http://localhost:" + serverPeer.rest_port,
    mid_b64: serverPeer.mid_b64,
};

describe("Client-Server Attestation including credential verification", function () {

    it("attests if verification succeeds", async function () {
        const server = mockAttestationServer();
        server.start();
        const client = mockAttestationClient();
        const myAttrs = {};

        await setupAttestationZero(client, server, myAttrs);
        const procedure: ClientProcedure = {
            server: serverId,
            desc: config.procedureOne,
        };
        const { data, attestations } = await executeProcedureFromClient(client, procedure, myAttrs);
        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("attribute_name", ATT_ONE);
        expect(data[0]).to.have.property("attribute_value", ATT_ONE_VAL);

        expect(attestations).to.be.an("array");
        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", ATT_ONE);
        expect(attestations[0]).to.have.property("signer_mid_64", serverPeer.mid_b64);
        console.log(attestations[0]);
    });

});

function mockAttestationClient() {
    const { ipv8_url, mid_hex, mid_b64 } = clientPeer;
    const factory = new AttestationClientFactory({ ipv8_url, mid_b64, mid_hex });
    return factory.create();
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
    const procedures: Dict<ProcedureConfig> = {
        [config.procedureZero.procedure_name]: {
            desc: config.procedureZero,
            resolver: config.zeroResolver,
        },
        [config.procedureOne.procedure_name]: {
            desc: config.procedureOne,
            resolver: config.OneResolver,
        },
    };
    const options = {
        ipv8_url: serverPeer.ipv8_url,
        http_port: serverPeer.rest_port,
    };
    return new AttestationServer(procedures, options);
}

function setupAttestationZero(client: AttestationClient, server: AttestationServer, myAttrs: Dict<string>) {
    const procedure: ClientProcedure = {
        server: serverId,
        desc: config.procedureZero,
    };
    return executeProcedureFromClient(client, procedure, myAttrs);
}
