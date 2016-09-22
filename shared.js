(function(){
  var ref$, map, keys, values, isEmpty, defaultsDeep, pick, find, net, colors, os, util, h, Backbone, subscriptionMan, _, Lweb, LwebInput, out$ = typeof exports != 'undefined' && exports || this;
  ref$ = require('lodash'), map = ref$.map, keys = ref$.keys, values = ref$.values, isEmpty = ref$.isEmpty, defaultsDeep = ref$.defaultsDeep, pick = ref$.pick, find = ref$.find;
  net = require('net');
  colors = require('colors');
  os = require('os');
  util = require('util');
  h = require('helpers');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  _ = require('underscore');
  out$.Lweb = Lweb = Backbone.Model.extend4000({
    name: 'lweb',
    initialize: function(arg$){
      this.node = arg$.node, this.ignore = arg$.ignore;
      return true;
    },
    log: function(logEvent){
      return this.node.send({
        log: logEvent
      });
    }
  });
  out$.LwebInput = LwebInput = Backbone.Model.extend4000({
    name: 'lweb',
    initialize: function(arg$){
      var logger, node;
      logger = arg$.logger, node = arg$.node;
      return node.subscribe({
        log: true
      }, function(arg$){
        var log, msg, data, tags;
        log = arg$.log, msg = log.msg, data = log.data, tags = log.tags;
        return logger.log(msg, data, tags);
      });
    }
  });
}).call(this);
