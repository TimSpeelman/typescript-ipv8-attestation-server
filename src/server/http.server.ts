import express from "express";
import { Dict } from "../types/Dict";
import { Credential, ProcedureConfig } from "../types/types";
import { AttestationServer } from "./attestation.server";

export class HttpAttestationServer {

    constructor(
        private configuration: Dict<ProcedureConfig>,
        private attestationServer: AttestationServer,
        private port: number = 3000
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

            this.attestationServer.initiateTransaction(
                config,
                credentialsParsed,
                { mid_b64, mid_hex }
            );
            res.send({ message: `Transaction started for mid ${mid_b64}.` });
        });

        app.get("/data", (req, res) => {
            res.setHeader("content-type", "application/json");
            const { mid } = req.query;
            if (!mid) {
                res.status(400).send({ error: "requires mid" });
            }
            console.log("REST: Received /data", req.query);
            this.attestationServer.getData(mid)
                .then((data) => res.send(data))
                .catch((err) => res.status(400).send(err));
        });

        app.listen(this.port, () => console.log(`Listening on port ${this.port}!`));

    }

}
