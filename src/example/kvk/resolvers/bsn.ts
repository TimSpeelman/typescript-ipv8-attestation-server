import uuid from "uuid/v4";
import { AttributeResolver } from "../../../types/types";

export const bsnResolver: AttributeResolver = () => Promise.resolve([{
    attribute_name: "bsn",
    attribute_value: "bsn2",
}]);
