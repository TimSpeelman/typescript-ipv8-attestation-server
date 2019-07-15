import { AttributeResolver, Credential } from "../../../types/types";
import { Database } from "../../Database";

const db = new Database({
    bsn1: "kvk1",
    bsn2: "kvk2",
});
const BSN_ATTR_NAME = "bsn";
const KVKNR_ATTR_NAME = "kvknr";

export const bsnToKvknrResolver: AttributeResolver = (credentials: Credential[]) => {
    const bsn = credentials.find((c) => c.attribute_name === BSN_ATTR_NAME);
    if (!bsn) {
        throw new Error("Cannot resolve without BSN");
    }
    return db.get(bsn.attribute_value).then((val) => ([{
        attribute_name: KVKNR_ATTR_NAME,
        attribute_value: val,
    }]));
};
