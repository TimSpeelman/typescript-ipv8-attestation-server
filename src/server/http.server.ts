import express from "express";
import { Dict } from "../ipv8/types/Dict";
import { Credential, ProcedureConfig } from "../types/types";
import { AttestationRequestResolver } from "./attestation.server";

export class HttpAttestationServer {

    constructor(
        private configuration: Dict<ProcedureConfig>,
        private attestationServer: AttestationRequestResolver,
        private port: number
    ) { }

    public start() {
        const app = express();

        app.get("/init", (req, res) => {
            console.log("REST: Received /init", req.query);

            res.setHeader("content-type", "application/json");
            const { procedure_id, mid_b64, mid_hex, credentials } = req.query;
            if (!procedure_id || !mid_b64 || !mid_hex || !credentials) {
                return res.status(400).send({ error: "missing parameters" });
            }

            if (!(procedure_id in this.configuration)) {
                return res.status(400).send({ error: "procedure unknown" });
            }
            const config = this.configuration[procedure_id];
            const credentialsParsed: Credential[] = JSON.parse(credentials || []);

            if (config.desc.requirements.length !== credentialsParsed.length) {
                return res.status(400).send({ error: "wrong number of credentials" });
            }

            const missing = config.desc.requirements.reduce((miss, attr_name) =>
                (!credentialsParsed.find((c: any) => c.attribute_name)) ? [...miss, attr_name] : miss,
                []);

            if (missing.length > 0) {
                return res.status(400).send({ error: `missing credentials ${missing.join(", ")}.` });
            }

            const transaction_id = this.attestationServer.executeTransaction(
                config,
                credentialsParsed,
                { mid_b64, mid_hex }
            );
            res.send({ message: `Transaction started for mid ${mid_b64}.`, transaction_id });
        });

        app.get("/data", (req, res) => {
            res.setHeader("content-type", "application/json");
            const { mid } = req.query;
            if (!mid ) {
                res.status(400).send({ error: "requires mid " });
            }
            console.log("REST: Received /data", req.query);
            res.send(this.attestationServer.getQueuedAttributes(mid));
        });

        app.listen(this.port, () => console.log(`Listening on port ${this.port}!`));

    }

}
