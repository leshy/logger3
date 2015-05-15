


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
  c "tet msg2", { extra: "data" }, 'more', 'tags', 'yes'
  test.done()
  
exports.callable = (test) ->
  logger = require './index.js'
  
  l = new logger.Logger context: { tags: [ 'bla' ] }
  l "test"

  l2 = l.child [ {}, [ 'b', 'c' ] ]
  l2 "test2"
  
  l3 = l2.child [ {}, [ 'd', 'c' ] ]
  l3 "test3"
  
  test.done()
