// Generated by LiveScript 1.4.0
(function(){
  var ref$, map, fold1, keys, values, first, flatten, h, net, Backbone, subscriptionMan, _, colors, UdpGun, os, util, throwError, ignoreError, callable, parseTags, Logger, parseArray, Console, Udp, tcpServer, slice$ = [].slice;
  ref$ = require('prelude-ls'), map = ref$.map, fold1 = ref$.fold1, keys = ref$.keys, values = ref$.values, first = ref$.first, flatten = ref$.flatten;
  h = require('helpers');
  net = require('net');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  _ = require('underscore');
  colors = require('colors');
  UdpGun = require('udp-client');
  os = require('os');
  util = require('util');
  throwError = function(it){
    if ((it != null ? it.constructor : void 8) === Error) {
      throw it;
    } else {
      return it;
    }
  };
  ignoreError = function(it){
    if ((it != null ? it.constructor : void 8) === Error) {} else {
      return it;
    }
  };
  callable = function(cls){
    var callable_cls;
    return callable_cls = function(){
      var args, obj;
      args = slice$.call(arguments);
      obj = function(){
        var args;
        args = slice$.call(arguments);
        return obj.call.apply(obj, args);
      };
      obj.__proto__ = cls.prototype;
      cls.apply(obj, args);
      return obj;
    };
  };
  parseTags = function(it){
    var x, tmp;
    switch (x = it != null ? it.constructor : void 8) {
    case undefined:
      return {};
    case String:
      tmp = {};
      tmp[it] = true;
      return tmp;
    case Object:
      return it.tags != null || it;
    case Array:
      return compose$(flatten, h.arrayToDict)(it);
    default:
      throw Error("tags type invalid");
    }
  };
  Logger = exports.Logger = subscriptionMan.basic.extend4000({
    call: function(){
      var args;
      args = slice$.call(arguments);
      return this.log.apply(this, args);
    },
    initialize: function(settings){
      var this$ = this;
      settings == null && (settings = {});
      this.context = compose$(this.ensureContext, ignoreError)(settings.context || {}) || {
        tags: {},
        data: {}
      };
      this.depth = settings.depth || 0;
      this.parent = settings.parent;
      this.outputs = new Backbone.Collection();
      if (settings.outputs) {
        _.map(settings.outputs, function(settings, name){
          return this$.outputs.push(new exports[name](settings));
        });
      } else if (this.depth === 0) {
        this.outputs.push(new Console());
      }
      return this.subscribe(true, function(event){
        this$.outputs.each(function(output){
          return output.log(event);
        });
        if (this$.parent) {
          return this$.parent.log(event);
        }
      });
    },
    addTags: function(tags){
      tags = parseTags(tags);
      return this.context.tags = h.extend(this.context.tags || {}, tags);
    },
    delTags: function(tags){
      tags = parseTags(tags);
      return this.context.tags = h.dictMap(this.context.tags, function(val, name){
        if (tags[name]) {
          return undefined;
        } else {
          return true;
        }
      });
    },
    extendContext: function(){
      var contexts;
      contexts = slice$.call(arguments);
      return this.context = h.extend(this.context, this.parseContexts(contexts));
    },
    child: function(){
      var contexts;
      contexts = slice$.call(arguments);
      return new Logger({
        depth: this.depth + 1,
        parent: this,
        context: this.parseContexts(contexts)
      });
    },
    ensureContext: function(it){
      var checkContextFun, passErr, checkContextArray, ensureType, checkContextObj, ensureTags, checkRest, err, this$ = this;
      checkContextFun = function(it){
        var x, ref$;
        switch (x = (ref$ = it.logContext) != null ? ref$.constructor : void 8) {
        case undefined:
          return it;
        case Object:
          return it.logContext;
        case Function:
          return it.logContext();
        default:
          return Error("logContext type mismatch");
        }
      };
      passErr = function(input, f){
        if ((input != null ? input.constructor : void 8) === Error) {
          return Error;
        } else {
          return f(input);
        }
      };
      checkContextArray = function(it){
        if ((it != null ? it.constructor : void 8) === Array) {
          return parseArray(it);
        } else {
          return it;
        }
      };
      ensureType = function(it){
        if ((it != null ? it.constructor : void 8) !== Object) {
          throw Error("couldn't cast to logContext (" + it + ")");
        } else {
          return it;
        }
      };
      checkContextObj = function(it){
        if (!it.tags && !it.data) {
          throw Error("this is not a valid logContext object '" + util.inspect(it) + "'");
        }
        return {
          tags: it.tags,
          data: it.data || {},
          msg: it.msg
        };
      };
      ensureTags = function(it){
        return {
          data: it.data,
          msg: it.msg,
          tags: parseTags(it.tags)
        };
      };
      checkRest = function(it){
        if (it.data != null && it.data.constructor !== Object) {
          throw Error("data constructor isn't object (" + it.data + ")");
        }
        if (it.msg != null && it.msg.constructor !== String) {
          throw Error("msg constructor isn't string (" + it.msg + ")");
        }
        return it;
      };
      try {
        return compose$(checkContextObj, ensureTags, checkRest)(
        compose$(checkContextFun, checkContextArray, ensureType)(
        it));
      } catch (e$) {
        err = e$;
        return err;
      }
    },
    parseContexts: function(contexts){
      return fold1(h.extend)(
      map(compose$(this.ensureContext, throwError))(
      contexts));
    },
    log: function(){
      var contexts, this$ = this;
      contexts = slice$.call(arguments);
      if (first(contexts).constructor === String) {
        contexts = [contexts];
      }
      return function(context){
        return function(){
          return this$.child(_.omit(context, 'data', 'msg'));
        };
      }(
      this.event(
      this.parseContexts(
      function(it){
        if (this$.context) {
          return h.unshift(it, this$.context);
        } else {
          return it;
        }
      }(
      contexts))));
    }
  });
  parseArray = exports.parseArray = function(arg$){
    var msg, data, tags, x;
    msg = arg$[0], data = arg$[1], tags = slice$.call(arg$, 2);
    switch (x = msg.constructor) {
    case String:
      return {
        msg: msg,
        data: data,
        tags: tags
      };
    case Object:
      return {
        data: msg,
        tags: data
      };
    }
  };
  Console = exports.Console = Backbone.Model.extend4000({
    name: 'console',
    initialize: function(){
      return this.startTime = process.hrtime()[0];
    },
    parseTags: function(tags){
      return map(function(tag){
        if (tag === 'fail' || tag === 'error') {
          return colors.red(tag);
        }
        if (tag === 'pass' || tag === 'ok' || tag === 'success' || tag === 'completed') {
          return colors.green(tag);
        }
        if (tag === 'GET' || tag === 'POST' || tag === 'login' || tag === 'in' || tag === 'out') {
          return colors.magenta(tag);
        }
        return colors.yellow(tag);
      })(
      keys(
      tags));
    },
    log: function(logEvent){
      var hrtime, tags;
      hrtime = process.hrtime();
      tags = this.parseTags(logEvent.tags);
      return console.log(colors.green((hrtime[0] - this.startTime) + "." + hrtime[1]) + "\t " + tags.join(', ') + "\t" + (logEvent.msg || "-"));
    }
  });
  Udp = exports.Udp = Backbone.Model.extend4000({
    name: 'udp',
    initialize: function(settings){
      this.settings = settings != null
        ? settings
        : {
          host: 'localhost',
          port: 6000
        };
      this.gun = new UdpGun(this.settings.port, this.settings.host);
      return this.hostname = os.hostname();
    },
    log: function(logEvent){
      return this.gun.send(new Buffer(JSON.stringify(_.extend({
        type: 'nodelogger',
        host: this.hostname
      }, this.settings.extendPacket || {}, {
        data: logEvent.data,
        tags: keys(logEvent.tags)
      }))));
    }
  });
  tcpServer = exports.tcpServer = Backbone.Model.extend4000({
    name: 'tcpServer',
    initialize: function(settings){
      var cnt, server, this$ = this;
      this.settings = settings != null
        ? settings
        : {
          port: 7000,
          host: '0.0.0.0'
        };
      cnt = 0;
      this.clients = {};
      server = net.createServer(function(socket){
        var id;
        id = cnt++;
        this$.clients[id] = socket;
        return socket.on('close', function(){
          var ref$, ref1$;
          return ref1$ = (ref$ = this$.clients)[id], delete ref$[id], ref1$;
        });
      });
      return server.listen(this.settings.port, this.settings.host);
    },
    log: function(logEvent){
      var this$ = this;
      return map(function(it){
        return it.write(JSON.stringify(_.extend({
          host: this$.hostname
        }, this$.settings.extendPacket || {}, {
          data: logEvent.data,
          tags: keys(logEvent.tags)
        })) + "\n");
      })(
      values(
      this.clients));
    }
  });
  function compose$() {
    var functions = arguments;
    return function() {
      var i, result;
      result = functions[0].apply(this, arguments);
      for (i = 1; i < functions.length; ++i) {
        result = functions[i](result);
      }
      return result;
    };
  }
}).call(this);
