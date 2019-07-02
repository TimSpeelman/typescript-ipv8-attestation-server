import { Dict } from "../types/Dict";

export class Database {
    constructor(private data: Dict<string>) { }
    public get(pii: string): Promise<string | null> {
        return Promise.resolve(pii in this.data ? this.data[pii] : null);
    }
}
