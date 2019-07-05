import fs from "fs";

const peers = JSON.parse(fs.readFileSync("temp/peers.json", { encoding: "utf8" }));

export const serverPeer = {
    ipv8_url: `http://localhost:${peers.server.port}`,
    rest_port: 3000,
    mid_b64: peers.server.mid_b64,
    mid_hex: peers.server.mid_hex,
};

export const clientPeer = {
    ipv8_url: `http://localhost:${peers.client.port}`,
    mid_b64: peers.client.mid_b64,
    mid_hex: peers.client.mid_hex,
};
