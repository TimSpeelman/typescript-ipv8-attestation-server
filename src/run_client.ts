import axios from "axios";
import { interval } from "rxjs";
import { IPv8API } from "./ipv8/ipv8.api";
import { queryString } from "./util/queryString";

const PID_ATTRIBUTE_NAME = "bsn";

const client = {
    api: new IPv8API("http://localhost:14410"),
    mid_hex: "3bb15e42430bba44503fe2aba5568d4191401f01",
    mid_b64: "O7FeQkMLukRQP+KrpVaNQZFAHwE=",
    bsn: {
        value: "bsn1",
        // hash: "WFCncbWmneuy0lkMnXwKC24SFRU=", Dynamic!
    }
};

const kvkServer = {
    http_address: "http://localhost:3000",
    mid_b64: "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=",
};

async function run() {
    // Confirm client has existing attribute bsn
    const res_attrs = await client.api.listAttestations();
    const hash_att = res_attrs.find((a) => a.attribute_name === PID_ATTRIBUTE_NAME);
    if (!hash_att) {
        throw new Error("Client has no BSN attestation!");
    }
    const bsn_hash = hash_att.attribute_hash;

    // Initiate the transaction
    const query_init = {
        mid_hex: client.mid_hex, mid_b64: client.mid_b64, attribute_hash: bsn_hash, pid: client.bsn.value
    };
    const res_init = await axios.get(`${kvkServer.http_address}/init?${queryString(query_init)}`);
    console.log("Initiated");

    // Await the verification request
    await acceptFirstVerificationOnRequest();
    console.log("Verification accepted");

    await promiseTimer(1200);

    // Then ask the server for our credentials
    const query_data = { mid: client.mid_b64 };
    const res_data = await axios.get(`${kvkServer.http_address}/data?${queryString(query_data)}`);
    console.log("Data received", res_data.data);

}

function promiseTimer(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function acceptFirstVerificationOnRequest(): Promise<boolean> {
    return new Promise((resolve) => {
        const sub = interval(1000).subscribe(() => {
            client.api.listVerificationRequests().then((requests) => {
                if (requests.length > 0) {
                    const request = requests[0];
                    client.api.allowVerify(request.mid_b64, request.attribute_name).then(() => {
                        console.log("Client: allowed the server to verify");
                        sub.unsubscribe();
                        resolve();
                    });
                } else {
                    console.log("Awaiting verification request..");
                }
            });
        });
    });
}

run();
