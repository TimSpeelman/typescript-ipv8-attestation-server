import { AxiosError, AxiosInstance } from "axios";
import { Attribute } from "../ipv8/types/Attribute";
import { queryString } from "../ipv8/util/queryString";
import { AttestationServerRESTAPI, ReqInitiate, ReqStaged } from "../server/api";

export class APIClient implements AttestationServerRESTAPI {
    constructor(
        private axios: AxiosInstance,
        private server_http_address: string
    ) { }

    public initiate(req: ReqInitiate): Promise<void> {
        const reqFormatted = {
            ...req,
            credentials: JSON.stringify(req.credentials),
        };
        return this.axios.get(`${this.server_http_address}/init?${queryString(reqFormatted)}`)
            .then(() => null)
            .catch(this.logAxiosError.bind(this));
    }

    public staged(req: ReqStaged): Promise<Attribute[]> {
        return this.axios.get(`${this.server_http_address}/data?${queryString(req)}`)
            .then((response) => response.data)
            .catch(this.logAxiosError.bind(this));
    }

    protected logAxiosError(error: AxiosError) {
        console.error("Request failed with status ",
            error.response.status, "and data", error.response.data);
        throw error;
    }
}
