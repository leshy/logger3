{ map, fold1, keys, values, first, flatten } = require 'prelude-ls'
h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require('subscriptionman2')

_ = require 'underscore'
# console logger
colors = require 'colors'

# udp logger
os = require 'os'
util = require 'util'

throwError = -> if it?@@ is Error then throw it else it
ignoreError = -> if it?@@ is Error then void else it

callable = (cls) ->
  callable_cls = (...args) ->
    obj = (...args) -> obj.call.apply obj, args
    obj.__proto__ = cls::
    cls.apply obj, args
    obj

parseTags = ->
  switch x = it?@@
    | undefined  => {}
    | String     => tmp = { }; tmp[it] = true; tmp
    | Number     => tmp = { }; tmp[String(it)] = true; tmp
    | Object     => it.tags? or it
    | Array      => (flatten >> h.arrayToDict)(it)
    | otherwise  => throw Error "tags type invalid, received: #{it}"

Logger = exports.Logger = subscriptionMan.basic.extend4000(
  call: (...args) -> @log.apply @, args
    
  initialize: (settings={}) ->
    @context = (@ensureContext >> ignoreError)(settings.context or {}) or { tags: {}, data: {} }
    @depth = settings.depth or 0
    @parent = settings.parent

    @outputs = new Backbone.Collection()

    if settings.outputs
      
      _.map settings.outputs, (settings,name) ~>
        if settings then @outputs.push new exports[name](settings)
    else if @depth is 0 then @outputs.push new Console()

    @subscribe true, (event) ~>
        @outputs.each (output) -> output.log event
        if @parent then @parent.log event
    
  addTags: (tags) ->
    tags = parseTags tags
    @context.tags = h.extend (@context.tags or {}), tags

  delTags: (tags) ->
    tags = parseTags tags
    @context.tags = h.dictMap @context.tags, (val,name) ->
      if tags[name] then undefined else true

  extendContext: (...contexts) ->
    @context = h.extend @context, @parseContexts contexts

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
      if it?@@ isnt Object then throw Error "couldn't cast to logContext (#{it})"
      else it

    # check if my context obj is valid
    checkContextObj = ->
      if not it.tags and not it.data
        throw Error "this is not a valid logContext object '#{util.inspect(it)}'"

      return it{tags, data or {}, msg}

    # make sure tags are an object and not an array or whatever
    ensureTags = ~>
      data: it.data
      msg: it.msg
      tags: parseTags it.tags

    checkRest = ->
      if it.data? and it.data@@ isnt Object
        throw Error "data constructor isn't object (#{it.data})"

      if it.msg? and it.msg@@ isnt String
        throw Error "msg constructor isn't string (#{it.msg})"
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
    if first(contexts)?@@ is String then contexts = [ contexts ]

    contexts
    |> ~> if @context then h.unshift it, @context else it
    |> @parseContexts
    |> @event
    |> (context) ~> ~> @child _.omit context, 'data', 'msg'
)


parseArray = exports.parseArray = ([msg, data, ...tags]) ->
  switch x = msg@@
  | String  => { msg: msg, data: data, tags: tags }
  | Object  => { data: msg, tags: data }
  

Console = exports.Console = Backbone.Model.extend4000 do
  name: 'console'
  initialize: -> @startTime = process.hrtime()[0]
  parseTags: (tags) -> tags |> keys

  log: (logEvent) ->
    hrtime = process.hrtime()
    tags = @parseTags logEvent.tags
    console.log colors.green("#{hrtime[0] - @startTime}.#{hrtime[1]}") + "\t{ " + tags.join(', ') + " }\t" + (logEvent.msg or "-")



getExports = exports.getExports = ~> module.exports
