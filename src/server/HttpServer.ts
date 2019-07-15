import bodyParser = require("body-parser");
import express, { Request, Response } from "express";
import { Dict } from "../ipv8/types/Dict";
import { ProcedureConfig } from "../types/types";
import { AttestationRequestResolver } from "./AttestationRequestResolver";
import { ReqInitiate } from "./IAttestationServerRESTAPI";
import { Validation } from "./Validation";

export class HttpServer {

    constructor(
        private configuration: Dict<ProcedureConfig>,
        private attestationServer: AttestationRequestResolver,
        private port: number,
        private logger: (...args: any[]) => void = console.log,
    ) { }

    public start() {
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));

        app.post("/init", this.handleInitiate.bind(this));
        app.get("/data", this.handleStaged.bind(this));

        app.listen(this.port);
    }

    protected handleInitiate(req: Request, res: Response) {
        console.log("REST: Received /init", req.body);

        res.setHeader("content-type", "application/json");

        // Validate Request
        const data = req.body;
        const error = Validation.initiate(data);
        if (error !== false) {
            return this.sendInvalidRequest(res, `Validation Error: ${error}`);
        }
        const { procedure_id, mid_b64, mid_hex, credentials } = data as ReqInitiate;
        const config = this.configuration[procedure_id];

        if (!config) {
            return this.sendInvalidRequest(res, "Procedure Unknown");
        }

        const { requirements: reqs } = config.desc;
        if (reqs.length !== credentials.length ||
            reqs.find((reqName) => !credentials.find((c) => c.attribute_name === reqName))) {

            return this.sendInvalidRequest(res, "Validation Error: incorrect credentials provided");
        }

        const transaction_id = this.attestationServer.executeTransaction(
            config,
            credentials,
            { mid_b64, mid_hex }
        );
        res.send({ message: `Transaction started for mid ${mid_b64}.`, transaction_id });
    }

    protected handleStaged(req: Request, res: Response) {
        console.log("REST: Received /data", req.query);
        res.setHeader("content-type", "application/json");
        const data = req.query;
        const error = Validation.staged(data);
        if (error !== false) {
            return this.sendInvalidRequest(res, `Validation Error: ${error}`);
        }
        const { mid_b64 } = data;
        res.send(this.attestationServer.getQueuedAttributes(mid_b64));
    }

    protected sendInvalidRequest(res: Response, error: string) {
        return res.status(400).send({ error });
    }

}
