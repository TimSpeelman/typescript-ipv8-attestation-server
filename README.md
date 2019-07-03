# KVK Attestation Server
TBD.

To run the example, first run the IPv8 services:
```
$ python ./run_ipv8.py
```
This will fire two instances of IPv8, one for the server and one for the client.

Then launch the server:
```
$ ts-node ./src/run_server.ts
```
This launches the attestation server, connected to the first IPv8 instance. It also runs a REST api on `localhost:3000`.

Now launch the client request script.
```
$ ts-node ./src/run_client.ts
```
This will ask the server to attest to a few attributes.
