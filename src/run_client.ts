import { AttestationClient } from "./attestation.client";
import { IPv8API } from "./ipv8/ipv8.api";
import { Dict } from "./types/Dict";
import { AttProcedure, Attribute, ClientProcedure, ProcedureDescription, ProviderDesc, ServerId } from "./types/types";

const providers: Dict<ProviderDesc> = {
    kvk: {
        id: {
            http_address: "http://localhost:3000",
            mid_b64: "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=",
        },
        procedures: {
            p_kvknr: {
                procedure_name: "p_kvknr",
                attribute_names: ["kvknr"],
                requirements: ["bsn"],
            },
            p_bsn: {
                procedure_name: "p_bsn",
                attribute_names: ["bsn"],
                requirements: [],
            }
        }
    }
};

const testClient = {
    api: new IPv8API("http://localhost:14410"),
    mid_hex: "3bb15e42430bba44503fe2aba5568d4191401f01",
    mid_b64: "O7FeQkMLukRQP+KrpVaNQZFAHwE=",
    credential_value: "bsn1",
};

// FIXME
const client_attributes = {
    // bsn: "a3531041-eb80-4c35-af3f-1f52f1e80c9c"
    bsn: "bsn1"
};

async function run() {

    const attClient = new AttestationClient({
        mid_hex: testClient.mid_hex,
        mid_b64: testClient.mid_b64,
    }, testClient.api);

    const procedureBSN: ClientProcedure = {
        desc: providers.kvk.procedures.p_bsn,
        server: providers.kvk.id,
    };

    const procedureKVK: ClientProcedure = {
        desc: providers.kvk.procedures.p_kvknr,
        server: providers.kvk.id,
    };

    const do_bsn = false;
    const do_kvk = true;

    if (do_bsn) {
        console.log("First fetching BSN");
        await attClient.execute(procedureBSN, client_attributes)
            .then(({ data, attestations }: any) => {
                data.forEach((attr: Attribute) => {
                    // @ts-ignore
                    client_attributes[attr.attribute_name] = attr.attribute_value;
                });
                testClient.api.listAttestations().then((atts) => {
                    console.log("Client's attestations:");
                    console.log(atts);
                });
            });

    }
    if (do_kvk) {
        console.log("Now fetching KVKnr");
        await attClient.execute(procedureKVK, client_attributes)
            .then(({ data, attestations }: any) => {
                data.forEach((attr: Attribute) => {
                    // @ts-ignore
                    client_attributes[attr.attribute_name] = attr.attribute_value;
                });
                testClient.api.listAttestations().then((atts) => {
                    console.log("Client's attestations:");
                    console.log(atts);
                });
            });

    }
}

run();
