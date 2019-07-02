import { Dict } from "../types/Dict";
import { ProcedureConfig } from "../types/types";
import { bsnResolver } from "./bsn";
import { bsnToKvknrResolver } from "./bsnToKvknr";

export const config: Dict<ProcedureConfig> = {
    p_kvknr: {
        desc: {
            attribute_names: ["kvknr"],
            procedure_name: "p_kvknr",
            requirements: ["bsn"],
        },
        resolver: bsnToKvknrResolver,
    },
    p_bsn: {
        desc: {
            attribute_names: ["bsn"],
            procedure_name: "p_bsn",
            requirements: [],
        },
        resolver: bsnResolver,
    }
};
