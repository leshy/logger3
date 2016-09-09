#autocompile
#
# this should use some plugin system. different outputs have very differnet and beefy dependencies
# check lego but also https://github.com/c9/architect

require! { 
  lodash: { map, keys, values, isEmpty, defaultsDeep, pick }
  
  net
  colors
  os
  util

  helpers: h

  backbone4000: Backbone  
  subscriptionman2: subscriptionMan
  underscore: '_'  
}

exports <<< require './index'

influx = exports.influx = Backbone.Model.extend4000 do
  name: 'influx'
  initialize: (settings={}) ->
    
    @settings = do
      client: 
        series: 'log',
        host: 'localhost',
        port: 8086
        protocol: 'http'
        username: 'node',
        database: 'logger'
      tagFields: { +module, +app }

    defaultsDeep @settings, settings


    @series = @settings.client.series
    @tagFields = keys @settings.tagFields

            
    influx = require 'influx'
    @client = influx @settings.client
    
  log: (logEvent) ->
    #@client.writePoint(seriesName, values, tags, [options], function(err, response) { })    
    @client.writePoint do
      @series
      logEvent.data <<< logEvent.tags
      pick logEvent.tags, @tagFields
      (err,res) ->
        console.log err, res

    
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
    if isEmpty entry.data then delete entry.data
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
