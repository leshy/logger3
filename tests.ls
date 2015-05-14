



exports.child = (test) ->
  logger = require './index.js'
  l = new logger.Logger context: { tags: [ 'bla' ] }
  child = l.child logger.Data {}, [ 'more', 'tags' ]
  ret = child.log logger.Data "test msg", { some: 'data' }, 'some', 'tags'
  console.log "RETURN",ret
  test.done()
