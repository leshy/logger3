



exports.child = (test) ->
  logger = require './index.js'
  l = new logger.Logger context: { tags: [ 'bla' ] }
  child = l.child logger.Data {}, [ 'more', 'tags' ]
  ret = child.log logger.Data "test msg", { some: 'data' }, 'some', 'tags'
  console.log "RETURN",ret
  test.done()



exports.childFromLog = (test) ->
  logger = require './index.js'
  l = new logger.Logger context: { tags: [ 'bla' ] }
  spawn = l.log logger.Data "test msg", { some: 'data' }, 'some', 'tags'

  c = spawn()
  c.log logger.Data "tet msg2", { more: 'data' }, 'more', 'tags', 'yes'
  test.done()
