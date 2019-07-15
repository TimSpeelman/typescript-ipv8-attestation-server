import { Dict } from "../../ipv8/types/Dict";
import { ProcedureConfig } from "../../types/types";
import { bsnResolver } from "./bsn";
import { bsnToKvknrResolver } from "./bsnToKvknr";
import { multiResolver } from "./multi";

export const config: Dict<ProcedureConfig> = {
    p_kvknr: {
        desc: {
            attributes: [{ name: "kvknr", type: "id_metadata" }],
            procedure_name: "p_kvknr",
            requirements: ["bsn"],
        },
        resolver: bsnToKvknrResolver,
    },
    p_bsn: {
        desc: {
            attributes: [{ name: "bsn", type: "id_metadata" }],
            procedure_name: "p_bsn",
            requirements: [],
        },
        resolver: bsnResolver,
    },
    p_multi: {
        desc: {
            attributes: [{ name: "kvk_att1", type: "id_metadata" }, { name: "kvk_att2", type: "id_metadata" }],
            procedure_name: "p_multi",
            requirements: ["bsn"],
        },
        resolver: multiResolver,
    }
};
