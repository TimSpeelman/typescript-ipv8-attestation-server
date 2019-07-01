
import axios, { AxiosAdapter } from "axios";
import { from, interval, Observable, timer } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { IPv8API } from "./ipv8/ipv8.api";
import { b64encode } from "./util/b64";
import { queryString } from "./util/queryString";
const server_http_addr = "http://localhost:3000";
const ipv8_api_client = new IPv8API("http://localhost:14410");
const ipv8_api_server = new IPv8API("http://localhost:8124");
const mid_server_b64 = "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=";
const mid_client_hex = "3bb15e42430bba44503fe2aba5568d4191401f01";
const mid_client_b64 = "O7FeQkMLukRQP+KrpVaNQZFAHwE=";

const my_bsn = "bsn1";

async function clientAttestBSN() {
    const res0 = await ipv8_api_server.connectPeer(mid_client_hex);
    console.log("B: Connected to A", res0);
    const res1 = await ipv8_api_client.requestAttestation(mid_server_b64, "bsn", "id_metadata");
    console.log("A: Attestation of bsn requested", res1);
    const res5 = await ipv8_api_server.listAttestationRequests();
    console.log("B: Listed requests", res5);
    const res6 = await ipv8_api_server.attest(mid_client_b64, "bsn", "bsn1");
    console.log("B: Attested to A", res6);
    // const res2 = await ipv8_api_client.attest(mid_client_b64, "bsn", "bsn1");
    // console.log("Attested myself", res2);
    const res3 = await ipv8_api_client.listAttestations();
    console.log("A: Attestations", res3);
    // const res4 = await ipv8_api_client.listAttestationRequests();
    // console.log("Attestation requests", res4);
}

clientAttestBSN();
