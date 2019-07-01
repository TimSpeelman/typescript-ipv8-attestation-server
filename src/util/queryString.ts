import { Dict } from "./Dict";

export function queryString(data: Dict<any>): string {
    return Object.entries(data)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
}
