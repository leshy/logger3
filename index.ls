{ map, fold1, values, keys } = require 'prelude-ls'
h = require 'helpers'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# console logger
colors = require 'colors'

# udp logger
UdpGun = require 'udp-client'
os = require 'os'


throwError = -> if it?@@ is Error then throw it else it
ignoreError = -> if it?@@ is Error then void else it

Logger = exports.Logger = subscriptionMan.basic.extend4000(
    initialize: (settings={}) ->
      @context = (@ensureContext >> ignoreError)(settings.context or {})
      @depth = settings.depth or 0
      @parent = settings.parent
      
      @outputs = new Backbone.Collection()

      if settings.outputs
          map settings.outputs, (settings,name) ~> 
              @outputs.push new exports[name](settings)
      else if @depth is 0 then @outputs.push new Console()

      @subscribe true, (event) ~>
          @outputs.each (output) -> output.log event
          if @parent then @parent.log event
            
    child: (...contexts) ->
      new Logger depth: @depth + 1, parent: @, context: @parseContexts contexts
    
    ensureContext: ->
      # does this object have a logContext function or value?
      checkContextFun = ->
        switch x = it.logContext?@@ # without equality here, this fails, wtf
        | undefined  => it
        | Object     => it.logContext
        | Function   => it.logContext()
        | otherwise  => Error "logContext type mismatch"

      # check if my context obj is valid
      checkContextObj = ->
        if it?@@ isnt Object then return Error "can't cast '#{it}' to logContext"
        if not it.tags and not it.data then return Error "this is not a valid logContext object"
        it{tags, data or {}, msg}

      # make sure tags are an object and not an array
      ensureTags = ->
        data: it.data or {}
        msg: it.msg or ""
        tags: switch x = it.tags?@@
        | undefined  => {}
        | Object     => it.tags
        | Array      => h.arrayToDict it.tags
        | otherwise  => Error "tags type invalid"

      (checkContextFun >> checkContextObj >> ensureTags) it

    parseContexts: (contexts) ->
      contexts
      |> map @ensureContext >> throwError
      |> fold1 h.extend

    log: (...contexts) ->
      contexts
      |> ~> h.unshift it, @context
      |> @parseContexts
      |> @event
)

Data = exports.Data = (msg, data={}, ...tags) -> 
  switch x = msg@@
  | String  => { msg: msg, data: data, tags: tags }
  | Object  => { data: msg, tags: data }
  
  

Console = exports.Console = Backbone.Model.extend4000(
  name: 'console'
  initialize: -> @startTime = process.hrtime()[0]
  parseTags: (tags) ->
    tags
    |> keys
    |> map (tag) ->
      if tag is 'fail' or tag is 'error' then return colors.red tag
      if tag is 'pass' or tag is 'ok' then return colors.green tag
      return colors.yellow tag

  log: (logEvent) ->
    hrtime = process.hrtime()
    tags = @parseTags logEvent.tags
    console.log colors.grey(new Date()) + "\t" + colors.green("#{hrtime[0]  - @startTime}.#{hrtime[1]}") + "\t " + tags.join(', ') + "\t⋅\t" + (logEvent.msg or "-")
)



Udp = exports.Udp = Backbone.Model.extend4000(
  name: 'udp'
  initialize: (@settings = { host: 'localhost', port: 6000 } ) ->
    @gun = new UdpGun @settings.port, @settings.host
    @hostname = os.hostname()

  log: (logEvent) ->
    @gun.send new Buffer JSON.stringify _.extend { type: 'nodelogger', host: @hostname }, (@settings.extendPacket or {}), { data: logEvent.data, tags: keys logEvent.tags }

)
