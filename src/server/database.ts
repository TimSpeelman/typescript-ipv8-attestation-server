import { Dict } from "../ipv8/types/Dict";

export class Database<Row> {
    constructor(private data: Dict<Row>) { }
    public get(pii: string): Promise<Row | null> {
        return Promise.resolve(pii in this.data ? this.data[pii] : null);
    }
}
