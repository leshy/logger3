


exports.child = (test) ->
  logger = require './index.js'
  l = new logger.Logger context: { tags: [ 'bla' ] }
  child = l.child [ {}, [ 'more', 'tags' ] ]
  ret = child.log [ "test msg", { some: 'data' }, 'some', 'tags' ]
  test.done()


exports.childFromLog = (test) ->
  logger = require './index.js'
  l = new logger.Logger context: { tags: [ 'bla' ] }
  spawn = l.log [ "test msg", { some: 'data' }, 'some', 'tags' ]
  c = spawn()
  c.log "tet msg2", { extra: "data" }, 'more', 'tags', 'yes'
  test.done()
