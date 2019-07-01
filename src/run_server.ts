import express from "express";
import uuid from "uuid/v4";
import { IPv8API } from "./ipv8/ipv8.api";
import { IPv8Service } from "./ipv8/ipv8.service";
import { AttestationServer } from "./server/attestation.server";
import { Database } from "./server/database";

const app = express();
const port = 3000;

const db = new Database({
    bsn1: "kvk1",
    bsn2: "kvk2",
});
const api = new IPv8API("http://localhost:8124");
const service = new IPv8Service(api);
const attServ = new AttestationServer(service, db);

app.get("/init", (req, res) => {
    res.setHeader("content-type", "application/json");
    const { pid, mid_b64, mid_hex, attribute_hash } = req.query;
    if (!pid || !mid_b64 || !mid_hex || !attribute_hash) {
        res.status(400).send({ error: "requires pid and mid_b64 and mid_hex and attribute_hash" });
    }
    const credential = {
        attribute_value: pid,
        attribute_hash,
    };
    console.log("REST: Received /init", req.query);
    attServ.initiateTransaction(credential, { mid_b64, mid_hex });
    res.send({ message: `Transaction started for BSN ${pid} and mid ${mid_b64}.` });
});

app.get("/data", (req, res) => {
    res.setHeader("content-type", "application/json");
    const { mid } = req.query;
    if (!mid) {
        res.status(400).send({ error: "requires mid" });
    }
    console.log("REST: Received /data", req.query);
    attServ.getData(mid)
        .then((data) => res.send(data))
        .catch((err) => res.send(err));
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
