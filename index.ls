#autocompile

{ obj-to-pairs, map, fold1, keys, values, first, flatten } = require 'prelude-ls'

require! {
  util
  os
  process
  leshdash: { find, defaultsDeep, reduce }: _
}

h = require 'helpers'
net = require 'net'

Backbone = require 'backbone4000'
subscriptionMan = require 'subscriptionman2'


# console logger
colors = require 'colors'

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
    | Array     => reduce it, ((tags, entry) -> tags <<< parseTags entry), {}
    | otherwise  => throw Error "tags type invalid, received: #{it}"
    
  ret
        
Logger = exports.Logger = subscriptionMan.basic.extend4000(
  call: (...args) -> @log.apply @, args
  
  defaultContext: (addContext={}) ->
    defaultsDeep {tags: { pid: process.pid, box: os.hostname! }}, addContext
    
  initialize: (settings={}) ->
    
    if not initContext = settings.context then initContext = @defaultContext(settings.addContext)
      
    @context = (@ensureContext >> ignoreError)(initContext)
    @depth = settings.depth or 0
    @parent = settings.parent
    @ignore = settings.ignore

    @outputs = new Backbone.Collection()

    if settings.outputs
      _.map settings.outputs, (settings, name) ~>
        if settings then @outputs.push new exports[name](settings)
    else if @depth is 0 then @outputs.push new exports.Console()


    @subscribe true, (event) ~>
        @outputs.each (output) -> output.log event
        if @parent then @parent.log event
    
  addTags: (tags) ->
    tags = parseTags tags
    @context.tags = (@context.tags or {}) <<< tags

  delTags: (tags) ->
    tags = parseTags tags
    @context.tags = h.dictMap @context.tags, (val,name) ->
      if tags[name] then undefined else true

  extendContext: (...contexts) ->
    @context <<< @parseContexts contexts

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
    logEvent.time = new Date!getTime!
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
  
