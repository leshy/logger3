{ map, fold1, keys, first } = require 'prelude-ls'
h = require 'helpers'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

# console logger
colors = require 'colors'

# udp logger
UdpGun = require 'udp-client'
os = require 'os'
_ = require 'underscore'
util = require 'util'

throwError = -> if it?@@ is Error then throw it else it
ignoreError = -> if it?@@ is Error then void else it

callable = (cls) ->
  callable_cls = (...args) ->
    obj = (...args) -> obj.call.apply obj, args
    obj.__proto__ = cls::
    cls.apply obj, args
    obj

Logger = exports.Logger = callable subscriptionMan.basic.extend4000(
  call: (...args) -> @log.apply @, args
  
  initialize: (settings={}) ->
    @context = (@ensureContext >> ignoreError)(settings.context or {})
    @depth = settings.depth or 0
    @parent = settings.parent

    @outputs = new Backbone.Collection()

    if settings.outputs
      console.log settings.outputs
      _.map settings.outputs, (settings,name) ~> 
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

    passErr = (input, f) ->
      if input?@@ is Error then Error else f(input)

    # did I get an array? if so, build context object
    checkContextArray = ->
      if it?@@ is Array then parseArray it else it

    # by this point I should be dealing with an object, if not, we got garbage as input
    ensureType = ->
      if it?@@ isnt Object then throw Error "couldn't cast '#{util.inpect it}' to logContext"
      else it

    # check if my context obj is valid
    checkContextObj = ->
      if not it.tags and not it.data
        throw Error "this is not a valid logContext object '#{util.inpect it}'"

      return it{tags, data or {}, msg}

    # make sure tags are an object and not an array
    ensureTags = ->
      data: it.data
      msg: it.msg 
      tags: switch x = it.tags?@@
      | undefined  => {}
      | String     => [ it.tags ]
      | Object     => it.tags
      | Array      => h.arrayToDict it.tags
      | otherwise  => throw Error "tags type invalid"

    checkRest = ->
      if it.data? and it.data@@ isnt Object
        return Error "data constructor isn't object (#{it.data})"

      if it.msg? and it.msg@@ isnt String
        return Error "msg constructor isn't string (#{it.msg})"          
      it

    try
      it
      |> checkContextFun >> checkContextArray >> ensureType
      |> checkContextObj >> ensureTags >> checkRest

    catch err
      err

  parseContexts: (contexts) ->
    contexts
    |> map @ensureContext >> throwError
    |> fold1 h.extend

  log: (...contexts) ->
    if first(contexts)@@ is String then contexts = [ contexts ]
    contexts
    |> ~> h.unshift it, @context
    |> @parseContexts
    |> @event
    |> (context) ~> ~> @child _.omit context, 'data', 'msg'
)

parseArray = exports.parseArray = ([msg, data, ...tags]) ->
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
