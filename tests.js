// Generated by LiveScript 1.3.1
(function(){
  exports.child = function(test){
    var logger, l, child, ret;
    logger = require('./index.js');
    l = new logger.Logger({
      context: {
        tags: ['bla']
      }
    });
    child = l.child([{}, ['more', 'tags']]);
    ret = child.log([
      "test msg", {
        some: 'data'
      }, 'some', 'tags'
    ]);
    return test.done();
  };
  exports.childFromLog = function(test){
    var logger, l, spawn, c;
    logger = require('./index.js');
    l = new logger.Logger({
      context: {
        tags: ['bla']
      }
    });
    spawn = l.log([
      "test msg", {
        some: 'data'
      }, 'some', 'tags'
    ]);
    c = spawn();
    c("tet msg2", {
      extra: "data"
    }, 'more', 'tags', 'yes');
    return test.done();
  };
  exports.callable = function(test){
    var logger, l, l2, l3;
    logger = require('./index.js');
    l = new logger.Logger({
      context: {
        tags: ['bla']
      }
    });
    l("test");
    l2 = l.child([{}, ['b', 'c']]);
    l2("test2");
    l3 = l2.child([{}, ['d', 'c']]);
    l3("test3");
    return test.done();
  };
}).call(this);
