# autocompile
#
# this should use some plugin system. different outputs have very differnet and beefy dependencies
# check lego but also https://github.com/c9/architect

require! { 
  lodash: { map, keys, values, isEmpty, defaultsDeep, pick, find }
  
  net
  colors
  os
  util

  helpers: h

  backbone4000: Backbone  
  subscriptionman2: subscriptionMan
  underscore: '_'  
}

export Lweb = Backbone.Model.extend4000 do
  name: 'lweb'
  initialize: ({@node, @ignore}) -> true
  log: (logEvent) -> @node.send log: logEvent


export LwebInput = Backbone.Model.extend4000 do
  name: 'lweb'
  initialize: ({ logger, node }) ->
    node.subscribe log: true, ({{ msg, data, tags }: log}) -> logger.log msg, data, tags
