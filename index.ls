Backbone = require 'backbone4000'
h = require 'helpers'
subscriptionMan = require('subscriptionman2')

colors = require 'colors'

UdpGun = require 'udp-client'
os = require 'os'
_ = require 'underscore'

{ map, fold1, lists-to-obj } = require 'prelude-ls'


Logger = exports.Logger = subscriptionMan.basic.extend4000(
    log: (...contexts) ->

      ensureContext = ->
        # does this object have a logContext function or value?
        checkContextFun = ->
          switch bla = it.logContext?@@
          | undefined  => it
          | Object     => it.logContext
          | Function   => it.logContext()
          | otherwise  => throw Error "logContext type mismatch"

        # check if my context obj is valid
        checkContextObj = ->
          if it?@@ isnt Object then throw Error "can't cast '#{it}' to logContext"
          if not it.tags and not it.data then throw Error "this is not a valid logContext object"
          it{tags, data or {}}

        # make sure tags are an object not an array
        ensureTags = ->
          data: it.data
          tags: switch it.tags@@
          | Object     => it.tags
          | Array      => h.arrayToDict it.tags
          | undefined  => {}
          | otherwise  => throw "invalid tags"


        (checkContextFun >> checkContextObj >> ensureTags) it

      send = ~> @event it
      
      contexts
      |> map ensureContext
      |> fold1 h.extend
      |> send
)



class Context
  -> @x = it
