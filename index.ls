Backbone = require 'backbone4000'
h = require 'helpers'
subscriptionMan = require('subscriptionman2')

colors = require 'colors'

UdpGun = require 'udp-client'
os = require 'os'

{ map, fold1 } = require 'prelude-ls'


throwError = -> if it?@@ is Error then throw it else it
isError = -> if it?@@ is Error then void else it

Logger = exports.Logger = subscriptionMan.basic.extend4000(
    initialize: (settings = {}) ->
      @context = (@ensureContext >> isError)(settings) or {}
      
    ensureContext: ->
      # does this object have a logContext function or value?
      checkContextFun = ->
        switch bla = it.logContext?@@
        | undefined  => it
        | Object     => it.logContext
        | Function   => it.logContext()
        | otherwise  => Error "logContext type mismatch"

      # check if my context obj is valid
      checkContextObj = ->
        if it?@@ isnt Object then return Error "can't cast '#{it}' to logContext"
        if not it.tags and not it.data then return Error "this is not a valid logContext object"
        it{tags, data or {}}

      # make sure tags are an object and not an array
      ensureTags = ->
        data: it.data
        tags: switch bla = it.tags?@@
        | undefined  => {}
        | Object     => it.tags
        | Array      => h.arrayToDict it.tags
        | otherwise  => Error "invalid tags"


      (checkContextFun >> checkContextObj >> ensureTags) it

    log: (...contexts) ->
      contexts
      |> ~> h.unshift it, @context
      |> map @ensureContext >> throwError
      |> fold1 h.extend
      |> @event
)



class Context
  -> @x = it
