{ map, fold1, keys, values, first, flatten } = require 'prelude-ls'
h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# udp logger
UdpGun = require 'udp-client'
os = require 'os'
util = require 'util'

module.exports = require('./index') <<< require('./shared')
