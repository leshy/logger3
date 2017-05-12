# autocompile
#
# this should use some plugin system. different outputs have very differnet and beefy dependencies
# check lego but also https://github.com/c9/architect

require! { 
  lodash: { map: lmap, keys, values, isEmpty, defaultsDeep, pick, omit, mapKeys, mapValues }
  
  net
  colors
  os
  util

  helpers: h

  backbone4000: Backbone  
  subscriptionman2: subscriptionMan
  underscore: '_'
}

{obj-to-pairs, map, fold1, keys, values, first, flatten } = require 'prelude-ls'



hashColors = [ colors.green, colors.rainbow, colors.yellow, colors.red, colors.blue, colors.cyan, colors.magenta, colors.grey, colors.white ]

exports.Console = Backbone.Model.extend4000 do
    name: 'console'
    initialize: -> @startTime = process.hrtime()[0]
    parseTags: (tags) ->
      tags
      |> obj-to-pairs
      |> map ([tag, value]) ->
        
        paintString = (value, name) ->
          if value in <[ fail error err warning warn 403 ]> then return colors.red value
          if value in <[ done pass ok success completed 200 ]> then return colors.green value
          if value in <[ exec task ]> then return colors.magenta value
          if value in <[ GET POST login in out skip 404 ]> then return colors.magenta value
          if name is 'pid' then value = hashColors[ Number(value) % hashColors.length ] String value
          return colors.yellow value

        if value is true then paintString tag
        else "#{colors.gray tag}:#{paintString value, tag}"

    log: (logEvent) ->
      hrtime = process.hrtime()
      tags = @parseTags logEvent.tags
      console.log colors.magenta(process.pid), colors.green("#{hrtime[0]  - @startTime}.#{hrtime[1]}") + "\t " + tags.join(', ') + "\t" + (logEvent.msg or "-")


Influx = exports.Influx = Backbone.Model.extend4000 do
  name: 'influx'
  initialize: (settings={}) ->

    @settings = do
      connection: 
        host: 'localhost'
        port: 8086
        protocol: 'http'
        username: 'node'
        database: 'logger'
        
      tagFields: { +module, +app }

    @settings = defaultsDeep settings, @settings

    @tagFields = keys @settings.tagFields
            
    require! { influx: { InfluxDB: influx } }
    @client = new influx @settings.connection

  log: (logEvent) ->
    #@client.writePoint(seriesName, values, tags, [options], function(err, response) { })
    removeForbidden = -> 
      forbiddenKeys = { +time, +measurement }
      mapKeys it, (val,key) -> if forbiddenKeys[ key ] then "_" + key else key

    flattenVals = ->
      mapValues it, (val,key) ->
        if not val? then return ""
        if val?@@ in [ Object, Array ] then JSON.stringify val
        else val
      
    data = {} <<< (flattenVals removeForbidden omit (logEvent.data <<< logEvent.tags), @tagFields)
    tags = removeForbidden pick logEvent.tags, @tagFields
    
#    console.log colors.green('log'), { data: data, tags: tags }

    @client.writePoints [ { measurement: "log", fields: data, tags: tags, time: new Date() } ]
    .catch -> console.error colors.red("error"), it.message
    

redis = exports.Redis = Backbone.Model.extend4000 do
  name: 'redis'
  initialize: (settings={}) ->
    
    @settings = do
      connection: 
        host: 'localhost'
        port: 6379
        
      channel: 'log'
      channelFields: { +pid, +module, +app }

    @settings = defaultsDeep settings, @settings

    @ <<< @settings{ channel, channelFields }
    
    redis = require 'redis'
    @client = redis.createClient @settings.connection
    
  log: (logEvent) ->
    channelName = @channel + "/" + (lmap do
      (pick logEvent.tags, keys @channelFields)
      (value, key) -> key + ":" + value
      ).join "/"
      
    @client.publish do
      channelName
      JSON.stringify logEvent

    
db = exports.db = exports.Mongo = Backbone.Model.extend4000 do
  name: 'db'
  initialize: (settings) ->
    @settings =  { name: 'log', collection: 'log', host: 'localhost', port: 27017, tail: h.Day * 30 * 6 } <<< settings
    
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
    entry = h.extendm { time: new Date(logEvent.time) }, logEvent
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
    
tcpServer = exports.tcpServer = Backbone.Model.extend4000 do
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

module.exports = require('./index') <<< require('./shared') <<< module.exports
