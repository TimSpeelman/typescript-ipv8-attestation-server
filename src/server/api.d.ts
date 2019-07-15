import { Attribute } from "../ipv8/types/Attribute";
import { Dict } from "../ipv8/types/Dict";
import { Credential } from "../types/types";

/** We share a typescript interface between front and backend. */
export interface AttestationServerRESTAPI {
    initiate: (req: ReqInitiate) => Promise<void>,
    staged: (req: ReqStaged) => Promise<Attribute[]>
}

export interface ReqInitiate {
    procedure_id: string,
    mid_b64: string,
    mid_hex: string,
    credentials: Credential[],
}

export interface ReqStaged {
    mid: string,
}
