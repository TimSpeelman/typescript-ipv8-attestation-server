from base64 import b64encode

from twisted.internet import reactor

from ipv8.configuration import get_default_configuration
from ipv8.REST.rest_manager import RESTManager
from ipv8_service import IPv8
from binascii import hexlify
import json
import os

names = ['server', 'client']
data = {}

# Launch two IPv8 services.
# We run REST endpoints for these services on:
#  - http://localhost:14411/
#  - http://localhost:14412/
# This script also prints the peer ids for reference with:
#  - http://localhost:1441*/attestation?type=peers

if not os.path.exists("temp"):
    os.mkdir("temp")

for i in [1, 2]:
    configuration = get_default_configuration()
    configuration['logger']['level'] = "ERROR"
    configuration['keys'] = [
        {'alias': "anonymous id", 'generation': u"curve25519", 'file': u"temp/ec%d_multichain.pem" % i},
        {'alias': "my peer", 'generation': u"medium", 'file': u"temp/ec%d.pem" % i}
    ]

    # Only load the basic communities
    requested_overlays = ['DiscoveryCommunity', 'AttestationCommunity', 'IdentityCommunity']
    configuration['overlays'] = [o for o in configuration['overlays'] if o['class'] in requested_overlays]

    # Give each peer a separate working directory
    working_directory_overlays = ['AttestationCommunity', 'IdentityCommunity']
    for overlay in configuration['overlays']:
        if overlay['class'] in working_directory_overlays:
            overlay['initialize'] = {'working_directory': 'temp/state_%d' % i}

    # Start the IPv8 service
    ipv8 = IPv8(configuration)
    rest_manager = RESTManager(ipv8)
    rest_manager.start(14410 + i)

    # Print the peer for reference
    print("Starting peer", i)
    print("port", (14410 + i))
    print("mid_b64", b64encode(ipv8.keys["anonymous id"].mid))
    print("mid_hex", hexlify(ipv8.keys["anonymous id"].mid))

    data[names[i-1]] = {
        'port': 14410 + i,
        'mid_b64': b64encode(ipv8.keys["anonymous id"].mid),
        'mid_hex': hexlify(ipv8.keys["anonymous id"].mid)
    }

with open('temp/peers.json', 'w') as outfile:  
    json.dump(data, outfile)

reactor.run()
