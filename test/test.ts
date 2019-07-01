import { from, interval, Observable, timer } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { IPv8API } from "../src/ipv8/ipv8.api";
import { b64encode } from "../src/util/b64";
const api1 = new IPv8API("http://localhost:8124");
const api2 = new IPv8API("http://localhost:14410");
const mid1_hex = "tAX/kPZ1E3KM/miu/4d2c1Ni9yw=";
const mid2_hex = "3bb15e42430bba44503fe2aba5568d4191401f01";
const mid2_b64 = "O7FeQkMLukRQP+KrpVaNQZFAHwE=";

function awaitPeer(api: IPv8API, mid_hex: string, mid_b64: string): Promise<boolean> {
    return new Promise((resolve) => {
        // First connect
        console.log(`Looking for ${mid_b64} (hex: ${mid_hex})`);
        api.connectPeer(mid_hex).catch(makeErrHandler("connectPeer"));
        const subInt = interval(1000).subscribe(() => {
            console.log(`Checking peers..`);
            api.listPeers().then((peers) => {
                if (peers.indexOf(mid_b64) >= 0) {
                    console.log(`Peer ${mid_b64} found!`);
                    resolve();
                    subInt.unsubscribe();
                }
            }).catch(makeErrHandler("listPeers"));
        });
    });
}

function checkUntilAttributeAttested(api: IPv8API, attribute_name: string) {
    const sub = interval(1000).subscribe(() => {
        console.log(`Has ${attribute_name} been attested?`);
        api.listAttestations().then((a) => {
            const matchingAttestation = a.find((att: any) => att[0] === attribute_name);
            if (matchingAttestation) {
                console.log(`Found attestation ${attribute_name}!`, matchingAttestation);
                sub.unsubscribe();
            }
        });
    });
}

function attestWhenRequested(api: IPv8API) {
    interval(1000).subscribe(() => {
        console.log("Attestations requests?");
        api.listAttestationRequests().then((a) => {
            if (a.length > 0) {
                console.log(`${a.length} requests found!`);

                for (const att of a) {
                    console.log("Attesting to", att);
                    api2.attest(att.mid_b64, att.attribute_name, "helloworld")
                        .then((r) => console.log("Attestation result", r))
                        .catch(makeErrHandler("attest"));
                }
            } else {
                console.log("No attestation requests yet..");
            }
        }).catch(makeErrHandler("listAttestationRequests"));
    });
}

const requestedAttribute = `${Date.now()}`;
awaitPeer(api1, mid2_hex, mid2_b64).then(() => {
    console.log("Requesting attestation for " + requestedAttribute);
    api1.requestAttestation(
        mid2_b64,
        requestedAttribute,
        "id_metadata",
    ).then((s) => {
        console.log("Requested attestation", s);
        checkUntilAttributeAttested(api1, requestedAttribute);
    })
        .catch(makeErrHandler("requestAttestation"));
});

attestWhenRequested(api2);

function makeErrHandler(reqName: string) {
    return (res: any) => console.error(reqName, res.response.status, res.response.data);
}
//
// timer(3000).subscribe(() => {
//     api1.listPeers().then((res) => console.log("Peers", res), console.log);

// api1.requestAttestation(
//     mid2_b64,
//     "att1",
//     "id_metadata",
// ).then((s) => console.log("Requested attestation", s))
//     .catch((res) => console.error(res.response.status, res.response.data));

//     interval(2000).subscribe(() =>
//         api1.listAttestations().then((a) => console.log("Attestations", a.map((x: any) => x[0])), console.log));

// });
// api1.listAttestations().then((a) => console.log("Attestations", a.map((x: any) => x[0])), console.log);

// timer(10000).subscribe(() =>
//     api2.listAttestationRequests().then(console.log, console.log));
// api2.listAttestationRequests().then(console.log, console.log);
//
// api2.attest(mid1_hex, "att1", "mylove").then(console.log).catch(console.error);
// api1.requestVerification(
//     mid_b64,
//     b64encode("kvknr"),
//     "123kvk",
//     "id_metadata",
//     { yeah: "right" }
// ).then(console.log).catch((res) => console.error(res.response.status, res.response.data));
