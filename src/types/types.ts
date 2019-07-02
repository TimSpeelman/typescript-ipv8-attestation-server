
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
    attribute_names: string[];
}

export interface ProcedureConfig {
    desc: ProcedureDescription;
    resolver: AttributeResolver;
}

export interface Attribute {
    attribute_name: string;
    attribute_value: string;
}

export type AttributeResolver = (credentials: Credential[]) => Promise<Attribute>;
