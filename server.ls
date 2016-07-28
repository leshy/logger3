#autocompile
{ obj-to-pairs, empty, map, fold, keys, values, first, flatten } = require 'prelude-ls'
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

exports <<< require('./index')

db = exports.db  = Backbone.Model.extend4000 do
  name: 'db'
  initialize: (settings) ->
    @settings =  { name: 'log', collection: 'log', host: 'localhost', port: 27017, tail: h.Day * 30 } <<< settings
    @mongodb = require 'mongodb'
    
    @db = new @mongodb.Db @settings.name, new @mongodb.Server(@settings.host or 'localhost', @settings.port or 27017), safe: true
    @db.open()
    @c = @db.collection @settings.collection

    @removeTail()
    setInterval (~> @removeTail()), h.Hour
      
  removeTail: (cb) ->
    splitPoint = Math.round((new Date().getTime() - @settings.tail) / 1000).toString(16)
    @c.remove { _id: { $lt: @mongodb.ObjectId(splitPoint + "0000000000000000") } }, cb
            
  log: (logEvent) ->
    entry = h.extendm { time: new Date() }, logEvent
    if empty entry.data then delete entry.data
    @c.insert entry

Fluent = exports.Fluent = Backbone.Model.extend4000 do
  name: 'fluent'
  initialize: (@settings = { host: 'localhost', name: 'logger', port: 24224 } ) ->
    @logger = require 'fluent-logger'
    @logger.configure os.hostname() + '.n.' + @settings.name, { host: @settings.host, port: @settings.port }
  log: (logEvent) ->
    @logger.emit keys(logEvent.tags).join('.'), h.extend (@settings.extendPacket or {}), logEvent.data


Sails = exports.Sails = Backbone.Model.extend4000 do
  name: 'sails'
  initialize: (@settings = { sails: false } ) ->
    if not @settings.sails then throw "Sails instance missing"
    @sails = @settings.sails
    
  log: (logEvent) ->
    @sails.sockets.broadcast 'log', 'log', logEvent
    @sails.emit 'log', logEvent
    
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
