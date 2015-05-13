

exports.test1 = (test) ->
  logger = require './index.js'
  l = new logger.Logger()
  console.log "RETURN:", l.log { tags: ['kk','ff'] }, { tags: ['lala'], data: { some: 'data' } }
  test.done()


#exports.test1()
