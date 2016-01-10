{ empty, map, fold1, keys, values, first, flatten } = require 'prelude-ls'
h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# console logger
colors = require 'colors'

# udp logger
UdpGun = require 'udp-client'
os = require 'os'
util = require 'util'
_ = require 'underscore'
index = require('./index')

module.exports = exports = index.getExports()

db = exports.db  = Backbone.Model.extend4000 do
  name: 'db'
  initialize: (settings) ->
    @settings =  h.extendm { name: 'log', collection: 'log', host: 'localhost', port: 27017 }, settings
    mongodb = require 'mongodb'
    console.log "DB START!", settings
    @db = new mongodb.Db @settings.name, new mongodb.Server(@settings.host or 'localhost', @settings.port or 27017), safe: true
    @db.open()
    @c = @db.collection @settings.collection
    
  log: (logEvent) ->
    entry = h.extendm { time: new Date() }, logEvent
    if empty entry.data then delete entry.data
    @c.insert entry

console.log keys index.exports

Console = exports.Console = Backbone.Model.extend4000(
  name: 'console'
  initialize: -> @startTime = process.hrtime()[0]
  parseTags: (tags) ->
    tags
    |> keys
    |> map (tag) ->
      if tag is 'fail' or tag is 'error' then return colors.red tag
      if tag in [ 'pass', 'ok', 'success', 'completed' ] then return colors.green tag
      if tag in [ 'GET','POST', 'login', 'in', 'out' ] then return colors.magenta tag
      return colors.yellow tag

  log: (logEvent) ->
    hrtime = process.hrtime()
    tags = @parseTags logEvent.tags
    console.log colors.green("#{hrtime[0]  - @startTime}.#{hrtime[1]}") + "\t " + tags.join(', ') + "\t" + (logEvent.msg or "-")
)


Fluent = exports.Fluent = Backbone.Model.extend4000 do
  name: 'fluent'
  initialize: (@settings = { host: 'localhost', name: 'logger', port: 24224 } ) ->
    @logger = require 'fluent-logger'
    @logger.configure os.hostname() + '.n.' + @settings.name, { host: @settings.host, port: @settings.port }
    console.log "FLUENT INIT"
  log: (logEvent) ->
    @logger.emit keys(logEvent.tags).join('.'), h.extend (@settings.extendPacket or {}), logEvent.data



Udp = exports.Udp = Backbone.Model.extend4000 do
  name: 'udp'

  initialize: (@settings = { host: 'localhost', port: 6000 } ) ->
    UdpGun = require 'udp-client'

    @gun = new UdpGun @settings.port, @settings.host
    @hostname = os.hostname()

  log: (logEvent) ->
    @gun.send new Buffer JSON.stringify _.extend { type: 'nodelogger', host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: keys logEvent.tags }


Tcp = exports.Tcp = Backbone.Model.extend4000 do
  name: 'tcp'
  initialize: (@settings = { host: 'localhost', port: 6001 } ) ->
    
    reconnecto = require('lweb3/transports/reconnecto').reconnecto
    nssocketClient = require('lweb3/transports/client/nssocket').nssocketClient

    @connection = new reconnecto do
      defaultChannelClass: nssocketClient.extend4000 do
        defaults:
          host: @settings.host
          port: @settings.port
          logger: @settings.logger
  
  log: (logEvent) ->
    @connection.send _.extend { type: 'nodelogger', host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: logEvent.tags }
    
tcpServer = exports.tcpServer = Backbone.Model.extend4000(
  name: 'tcpServer'

  initialize: (@settings = { port: 7000, host: '0.0.0.0' } ) ->
    cnt = 0
    @clients = {}
    server = net.createServer (socket) ~>
      id = cnt++
      @clients[id] = socket
      socket.on 'close', ~> delete @clients[id]
      socket.on 'error', ~> delete @clients[id]
    server.listen @settings.port, @settings.host

  log: (logEvent) ->
    try
      @clients
        |> values
        |> map (client) ~>
          client.write JSON.stringify(_.extend { host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: keys logEvent.tags }) + "\n"
)
