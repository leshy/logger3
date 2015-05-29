{ map, fold1, keys, values, first, flatten } = require 'prelude-ls'
h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# udp logger
UdpGun = require 'udp-client'
os = require 'os'
util = require 'util'

h.extendm exports, require('./index')

Console = exports.Console = Backbone.Model.extend4000(
  name: 'console'
  initialize: -> @startTime = process.hrtime()[0]
  parseTags: (tags) ->
    tags
    |> keys

  log: (logEvent) ->
    hrtime = new Date().getTime()
    tags = @parseTags logEvent.tags
    console.log "#{hrtime[0]  - @startTime}.#{hrtime[1]}") + "\t " + tags.join(', ') + "\t" + (logEvent.msg or "-")
