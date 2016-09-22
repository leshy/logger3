#autocompile

{obj-to-pairs, map, fold1, keys, values, first, flatten } = require 'prelude-ls'

require! { leshdash: { find } }

h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require 'subscriptionman2'

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
  
  ret = switch x = it?@@
    | undefined  => {}
    | String     => { "#{it}": true }
    | Number     => { "#{it}": true }
    | Object     => it.tags? or it
    | Array     => _.reduce it, ((tags, entry) -> tags <<< parseTags entry), {}
    | otherwise  => throw Error "tags type invalid, received: #{it}"
    
  ret
        

Logger = exports.Logger = subscriptionMan.basic.extend4000(
  call: (...args) -> @log.apply @, args
    
  initialize: (settings={}) ->
    @context = (@ensureContext >> ignoreError)(settings.context or {}) or { tags: {}, data: {} }
    @depth = settings.depth or 0
    @parent = settings.parent
    @ignore = settings.ignore

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
    new Logger depth: @depth + 1, parent: @, context: @parseContexts contexts, ignore: @ignore

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

  maybeEvent: (logEvent) ->
    if @ignore and (find (keys logEvent.tags), ~> @ignore[ it ]) then return
    @event logEvent
  
  log: (...contexts) ->
    if first(contexts)?@@ is String then contexts = [ contexts ]

    contexts
    |> ~> if @context then h.unshift it, @context else it
    |> @parseContexts
    |> @maybeEvent
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
    |> obj-to-pairs
    |> map ([tag, value]) ->

      paintString = -> 
        if it in <[ fail error err warning warn ]> then return colors.red it
        if it in <[ done pass ok success completed ]> then return colors.green it
        if it in <[ exec task ]> then return colors.magenta it
        if it in <[ GET POST login in out skip]> then return colors.magenta it
        return colors.yellow it

      if value is true then paintString tag
      else "#{colors.gray tag}:#{paintString value}"

  log: (logEvent) ->
    hrtime = process.hrtime()
    tags = @parseTags logEvent.tags
    console.log colors.magenta(process.pid), colors.green("#{hrtime[0]  - @startTime}.#{hrtime[1]}") + "\t " + tags.join(', ') + "\t" + (logEvent.msg or "-")
)
