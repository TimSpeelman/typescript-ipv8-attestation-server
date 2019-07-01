import axios, { AxiosAdapter } from "axios";
import { from, interval, Observable, timer } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { IPv8API } from "../src/ipv8/ipv8.api";
import { b64encode } from "../src/util/b64";
import { queryString } from "../src/util/queryString";
const server_http_addr = "http://localhost:3000";
const ipv8_api_client = new IPv8API("http://localhost:14410");
const ipv8_api_server = new IPv8API("http://localhost:8124");
const mid_server_b64 = "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=";
const mid_client_hex = "3bb15e42430bba44503fe2aba5568d4191401f01";
const mid_client_b64 = "O7FeQkMLukRQP+KrpVaNQZFAHwE=";

const my_bsn = "bsn1";

const hash = "pKgjwKT+DdQpZvxwYOcx5d+fx78=";

// Client initiates request
const query = {
    mid_hex: mid_client_hex,
    mid_b64: mid_client_b64,
    attribute_hash: hash,
    pid: my_bsn,
};
axios.get(`${server_http_addr}/init?${queryString(query)}`)
    .then(() => {
        // Client should get the verification request
        interval(1000).subscribe(() => {
            ipv8_api_client.listVerificationRequests().then((res) => {
                if (res.length > 0) {
                    console.log("Client: got a verification request", res);
                    ipv8_api_client.allowVerify(mid_server_b64, "bsn").then(() => {
                        console.log("Client: allowed the server to verify");
                    });
                    const query2 = { mid: mid_client_b64 };
                    axios.get(`${server_http_addr}/data?${queryString(query2)}`)
                        .then((res2) => console.log("Got data from server: ", res2.data));
                }
            });
        });
    })
    .catch(console.error);
