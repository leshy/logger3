{ map, fold1, keys, values, first, flatten } = require 'prelude-ls'
h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# udp logger
UdpGun = require 'udp-client'
os = require 'os'
util = require 'util'

Console = exports.Console = Backbone.Model.extend4000 do
  name: 'console'
  log: (logEvent) -> console.log logEvent

module.exports = require('./index') <<< require('./shared') <<< module.exports
