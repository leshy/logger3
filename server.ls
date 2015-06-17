{ map, fold1, keys, values, first, flatten } = require 'prelude-ls'
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

h.extendm exports, require('./index')

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


Udp = exports.Udp = Backbone.Model.extend4000(
  name: 'udp'
  initialize: (@settings = { host: 'localhost', port: 6000 } ) ->
    @gun = new UdpGun @settings.port, @settings.host
    @hostname = os.hostname()

  log: (logEvent) ->
    @gun.send new Buffer JSON.stringify h.extendm { type: 'nodelogger', host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: keys logEvent.tags }
)


tcpServer = exports.tcpServer = Backbone.Model.extend4000(
  name: 'tcpServer'
  initialize: (@settings = { port: 7000, host: '0.0.0.0' } ) ->
    cnt = 0
    @clients = {}
    server = net.createServer (socket) ~>
      id = cnt++
      @clients[id] = socket
      socket.on 'close', ~> delete @clients[id]

    server.listen @settings.port, @settings.host


  log: (logEvent) ->
    @clients
      |> values
      |> map ~> it.write JSON.stringify(h.extendm { host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: keys logEvent.tags }) + "\n"
)
