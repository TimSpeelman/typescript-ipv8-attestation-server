import { Attribute } from "../ipv8/types/Attribute";
import { Dict } from "../ipv8/types/Dict";

export interface ServerId {
    http_address: string;
    mid_b64: string;
}

export interface AttProcedure {
    procedure_name: string;
    attribute_name: string;
    credential_name: string;
    server: ServerId;
}

export interface PeerId {
    mid_b64: string;
    mid_hex: string;
}

export interface Credential {
    attribute_name: string;
    attribute_value: string;
    attribute_hash: string;
}

export interface ProcedureDescription {
    procedure_name: string;
    requirements: string[];
    attributes: AttributeDescription[];
}

export interface AttributeDescription {
    name: string;
    type: string;
}

export interface ProcedureConfig {
    desc: ProcedureDescription;
    resolver: AttributeResolver;
}

export type AttributeResolver = (credentials: Credential[]) => Promise<Attribute[]>;

export interface ProviderDesc {
    id: ServerId;
    procedures: Dict<ProcedureDescription>;
}

export interface ClientProcedure {
    desc: ProcedureDescription;
    server: ServerId;
}
