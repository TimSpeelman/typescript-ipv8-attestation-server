import { Dict } from "../../ipv8/types/Dict";
import { ProcedureConfig } from "../../types/types";
import { bsnResolver } from "./resolvers/bsn";
import { bsnToKvknrResolver } from "./resolvers/bsnToKvknr";
import { multiResolver } from "./resolvers/multi";

export const KVKProcedures: Dict<ProcedureConfig> = {
    p_bsn: {
        desc: {
            attributes: [{ name: "bsn", type: "id_metadata" }],
            procedure_name: "p_bsn",
            requirements: [],
        },
        resolver: bsnResolver,
    },
    p_kvknr: {
        desc: {
            attributes: [{ name: "kvknr", type: "id_metadata" }],
            procedure_name: "p_kvknr",
            requirements: ["bsn"],
        },
        resolver: bsnToKvknrResolver,
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
