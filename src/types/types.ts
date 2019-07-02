
export interface ServerId {
    http_address: string;
    mid_b64: string;
}

export interface AttProcedure {
    attribute_name: string;
    credential_name: string;
    server: ServerId;
}

export interface PeerId {
    mid_b64: string;
    mid_hex: string;
}

export interface Credential {
    attribute_value: string;
    attribute_hash: string;
}
