// Generated by LiveScript 1.3.1
(function(){
  var ref$, map, fold1, values, keys, h, Backbone, subscriptionMan, colors, UdpGun, os, throwError, ignoreError, Logger, Data, Console, Udp, slice$ = [].slice;
  ref$ = require('prelude-ls'), map = ref$.map, fold1 = ref$.fold1, values = ref$.values, keys = ref$.keys;
  h = require('helpers');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  colors = require('colors');
  UdpGun = require('udp-client');
  os = require('os');
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
  Logger = exports.Logger = subscriptionMan.basic.extend4000({
    initialize: function(settings){
      var this$ = this;
      settings == null && (settings = {});
      this.context = compose$(this.ensureContext, ignoreError)(settings.context || {});
      this.depth = settings.depth || 0;
      this.parent = settings.parent;
      this.outputs = new Backbone.Collection();
      if (settings.outputs) {
        map(settings.outputs, function(settings, name){
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
      var checkContextFun, checkContextObj, ensureTags;
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
      checkContextObj = function(it){
        if ((it != null ? it.constructor : void 8) !== Object) {
          return Error("can't cast '" + it + "' to logContext");
        }
        if (!it.tags && !it.data) {
          return Error("this is not a valid logContext object");
        }
        return {
          tags: it.tags,
          data: it.data || {},
          msg: it.msg
        };
      };
      ensureTags = function(it){
        var x;
        return {
          data: it.data || {},
          msg: it.msg || "",
          tags: (function(){
            var ref$;
            switch (x = (ref$ = it.tags) != null ? ref$.constructor : void 8) {
            case undefined:
              return {};
            case Object:
              return it.tags;
            case Array:
              return h.arrayToDict(it.tags);
            default:
              return Error("tags type invalid");
            }
          }())
        };
      };
      return compose$(checkContextFun, checkContextObj, ensureTags)(it);
    },
    parseContexts: function(contexts){
      return fold1(h.extend)(
      map(compose$(this.ensureContext, throwError))(
      contexts));
    },
    log: function(){
      var contexts, this$ = this;
      contexts = slice$.call(arguments);
      return this.event(
      this.parseContexts(
      function(it){
        return h.unshift(it, this$.context);
      }(
      contexts)));
    }
  });
  Data = exports.Data = function(msg, data){
    var tags, x;
    data == null && (data = {});
    tags = slice$.call(arguments, 2);
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
        if (tag === 'pass' || tag === 'ok') {
          return colors.green(tag);
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
      return console.log(colors.grey(new Date()) + "\t" + colors.green((hrtime[0] - this.startTime) + "." + hrtime[1]) + "\t " + tags.join(', ') + "\t⋅\t" + (logEvent.msg || "-"));
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
