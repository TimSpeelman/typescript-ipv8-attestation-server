import uuid from "uuid/v4";

export const bsnResolver = () => Promise.resolve({
    attribute_name: "bsn",
    attribute_value: uuid(),
});
