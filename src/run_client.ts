import { AttestationClient } from "./attestation.client";
import { IPv8API } from "./ipv8/ipv8.api";
import { AttProcedure } from "./types/types";

const kvkServer = {
    http_address: "http://localhost:3000",
    mid_b64: "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=",
};

const kvkNrProcedure: AttProcedure = {
    attribute_name: "kvknr",
    credential_name: "bsn",
    server: kvkServer,
};

const testClient = {
    api: new IPv8API("http://localhost:14410"),
    mid_hex: "3bb15e42430bba44503fe2aba5568d4191401f01",
    mid_b64: "O7FeQkMLukRQP+KrpVaNQZFAHwE=",
    credential_value: "bsn1",
};

async function run() {

    const attClient = new AttestationClient({
        mid_hex: testClient.mid_hex,
        mid_b64: testClient.mid_b64,
    }, testClient.api);

    attClient.execute(kvkNrProcedure, testClient.credential_value)
        .then((data) => {
            console.log("Procedure complete! Data:", data);
            testClient.api.listAttestations().then((atts) => {
                console.log("Client's attestations:");
                console.log(atts);
            });
        });

}

run();
