import { AttestationClient } from "./attestation.client";
import { clientPeer, serverPeer } from "./config";
import { IPv8API } from "./ipv8/IPv8API";
import { Attribute } from "./ipv8/types/Attribute";
import { Dict } from "./ipv8/types/Dict";
import { VerifieeService } from "./ipv8/VerifieeService";
import { ClientProcedure, ProviderDesc } from "./types/types";

const providers: Dict<ProviderDesc> = {
    kvk: {
        id: {
            http_address: `http://localhost:${serverPeer.rest_port}`,
            mid_b64: serverPeer.mid_b64,
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
            },
            p_multi: {
                procedure_name: "p_multi",
                attribute_names: ["kvk_att1", "kvk_att2"],
                requirements: ["bsn"],
            }
        }
    }
};

function getProcedure(providerName: string, procedureId: string): ClientProcedure {
    if (!(providerName in providers)) { throw new Error(`Unknown provider ${providerName}.`); }

    const procedures = providers[providerName].procedures;
    if (!(procedureId in procedures)) { throw new Error(`Unknown procedure ${procedureId}.`); }
    return {
        desc: procedures[procedureId],
        server: providers[providerName].id,
    };
}

const clientId = {
    api: new IPv8API(clientPeer.ipv8_url),
    mid_hex: clientPeer.mid_hex,
    mid_b64: clientPeer.mid_b64,
};

/** Cache of client's attributes */
const clientAttributes: Dict<string> = {};

async function run() {
    const time = Date.now;

    const verifieeService = new VerifieeService(clientId.api, time);
    const attClient = new AttestationClient({
        mid_hex: clientId.mid_hex,
        mid_b64: clientId.mid_b64,
    }, clientId.api, verifieeService);

    const do_bsn = true;
    const do_kvk = true;

    if (do_bsn) {
        await executeProcedure("kvk", "p_bsn");
    }
    if (do_kvk) {
        await executeProcedure("kvk", "p_multi");
    }

    async function executeProcedure(providerName: string, procedureId: string) {
        await attClient.execute(getProcedure(providerName, procedureId), clientAttributes)
            .then(({ data, attestations }: any) => {
                data.forEach((attr: Attribute) => {
                    // @ts-ignore
                    clientAttributes[attr.attribute_name] = attr.attribute_value;
                });

            });
        await clientId.api.listAttestations().then((atts) => {
            console.log("Client's attestations:");
            console.log(atts);
        });
    }
}

run();
