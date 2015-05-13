// Generated by LiveScript 1.3.1
(function(){
  var Backbone, h, subscriptionMan, colors, UdpGun, os, ref$, map, fold1, throwError, isError, Logger, Context, slice$ = [].slice;
  Backbone = require('backbone4000');
  h = require('helpers');
  subscriptionMan = require('subscriptionman2');
  colors = require('colors');
  UdpGun = require('udp-client');
  os = require('os');
  ref$ = require('prelude-ls'), map = ref$.map, fold1 = ref$.fold1;
  throwError = function(it){
    if ((it != null ? it.constructor : void 8) === Error) {
      throw it;
    } else {
      return it;
    }
  };
  isError = function(it){
    if ((it != null ? it.constructor : void 8) === Error) {} else {
      return it;
    }
  };
  Logger = exports.Logger = subscriptionMan.basic.extend4000({
    initialize: function(settings){
      settings == null && (settings = {});
      return this.context = compose$(this.ensureContext, isError)(settings) || {};
    },
    ensureContext: function(it){
      var checkContextFun, checkContextObj, ensureTags;
      checkContextFun = function(it){
        var bla, ref$;
        switch (bla = (ref$ = it.logContext) != null ? ref$.constructor : void 8) {
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
          data: it.data || {}
        };
      };
      ensureTags = function(it){
        var bla;
        return {
          data: it.data,
          tags: (function(){
            var ref$;
            switch (bla = (ref$ = it.tags) != null ? ref$.constructor : void 8) {
            case undefined:
              return {};
            case Object:
              return it.tags;
            case Array:
              return h.arrayToDict(it.tags);
            default:
              return Error("invalid tags");
            }
          }())
        };
      };
      return compose$(checkContextFun, checkContextObj, ensureTags)(it);
    },
    log: function(){
      var contexts, this$ = this;
      contexts = slice$.call(arguments);
      return this.event(
      fold1(h.extend)(
      map(compose$(this.ensureContext, throwError))(
      function(it){
        return h.unshift(it, this$.context);
      }(
      contexts))));
    }
  });
  Context = (function(){
    Context.displayName = 'Context';
    var prototype = Context.prototype, constructor = Context;
    function Context(it){
      this.x = it;
    }
    return Context;
  }());
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
