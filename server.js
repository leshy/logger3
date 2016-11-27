(function(){
  var ref$, lmap, keys, values, isEmpty, defaultsDeep, pick, omit, mapKeys, mapValues, net, colors, os, util, h, Backbone, subscriptionMan, _, objToPairs, map, fold1, first, flatten, hashColors, Influx, redis, db, Fluent, Sails, Udp, Tcp, tcpServer;
  ref$ = require('lodash'), lmap = ref$.map, keys = ref$.keys, values = ref$.values, isEmpty = ref$.isEmpty, defaultsDeep = ref$.defaultsDeep, pick = ref$.pick, omit = ref$.omit, mapKeys = ref$.mapKeys, mapValues = ref$.mapValues;
  net = require('net');
  colors = require('colors');
  os = require('os');
  util = require('util');
  h = require('helpers');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  _ = require('underscore');
  ref$ = require('prelude-ls'), objToPairs = ref$.objToPairs, map = ref$.map, fold1 = ref$.fold1, keys = ref$.keys, values = ref$.values, first = ref$.first, flatten = ref$.flatten;
  hashColors = [colors.green, colors.rainbow, colors.yellow, colors.red, colors.blue, colors.cyan, colors.magenta, colors.grey, colors.white];
  exports.Console = Backbone.Model.extend4000({
    name: 'console',
    initialize: function(){
      return this.startTime = process.hrtime()[0];
    },
    parseTags: function(tags){
      return map(function(arg$){
        var tag, value, paintString;
        tag = arg$[0], value = arg$[1];
        paintString = function(value, name){
          if (value === 'fail' || value === 'error' || value === 'err' || value === 'warning' || value === 'warn') {
            return colors.red(value);
          }
          if (value === 'done' || value === 'pass' || value === 'ok' || value === 'success' || value === 'completed') {
            return colors.green(value);
          }
          if (value === 'exec' || value === 'task') {
            return colors.magenta(value);
          }
          if (value === 'GET' || value === 'POST' || value === 'login' || value === 'in' || value === 'out' || value === 'skip') {
            return colors.magenta(value);
          }
          if (name === 'pid') {
            value = hashColors[Number(value) % hashColors.length](String(value));
          }
          return colors.yellow(value);
        };
        if (value === true) {
          return paintString(tag);
        } else {
          return colors.gray(tag) + ":" + paintString(value, tag);
        }
      })(
      objToPairs(
      tags));
    },
    log: function(logEvent){
      var hrtime, tags;
      hrtime = process.hrtime();
      tags = this.parseTags(logEvent.tags);
      return console.log(colors.magenta(process.pid), colors.green((hrtime[0] - this.startTime) + "." + hrtime[1]) + "\t " + tags.join(', ') + "\t" + (logEvent.msg || "-"));
    }
  });
  Influx = exports.Influx = Backbone.Model.extend4000({
    name: 'influx',
    initialize: function(settings){
      var influx;
      settings == null && (settings = {});
      this.settings = {
        connection: {
          host: 'localhost',
          port: 8086,
          protocol: 'http',
          username: 'node',
          database: 'logger'
        },
        tagFields: {
          module: true,
          app: true
        }
      };
      this.settings = defaultsDeep(settings, this.settings);
      this.tagFields = keys(this.settings.tagFields);
      influx = require('influx').InfluxDB;
      return this.client = new influx(this.settings.connection);
    },
    log: function(logEvent){
      var removeForbidden, flattenVals, data, tags;
      removeForbidden = function(it){
        var forbiddenKeys;
        forbiddenKeys = {
          time: true,
          measurement: true
        };
        return mapKeys(it, function(val, key){
          if (forbiddenKeys[key]) {
            return "_" + key;
          } else {
            return key;
          }
        });
      };
      flattenVals = function(it){
        return mapValues(it, function(val, key){
          var ref$;
          if (val == null) {
            return "";
          }
          if ((ref$ = val != null ? val.constructor : void 8) === Boolean || ref$ === Object || ref$ === Array) {
            return JSON.stringify(val);
          } else {
            return val;
          }
        });
      };
      data = import$({}, flattenVals(removeForbidden(omit(import$(logEvent.data, logEvent.tags), this.tagFields))));
      tags = removeForbidden(pick(logEvent.tags, this.tagFields));
      return this.client.writePoints([{
        measurement: "log",
        fields: data,
        tags: tags,
        time: new Date()
      }])['catch'](function(it){
        return console.error(colors.red("error"), it.message);
      });
    }
  });
  redis = exports.Redis = Backbone.Model.extend4000({
    name: 'redis',
    initialize: function(settings){
      var ref$, redis;
      settings == null && (settings = {});
      this.settings = {
        connection: {
          host: 'localhost',
          port: 6379
        },
        channel: 'log',
        channelFields: {
          pid: true,
          module: true,
          app: true
        }
      };
      this.settings = defaultsDeep(settings, this.settings);
      this.channel = (ref$ = this.settings).channel;
      this.channelFields = ref$.channelFields;
      redis = require('redis');
      return this.client = redis.createClient(this.settings.connection);
    },
    log: function(logEvent){
      var channelName, ref$;
      channelName = this.channel + "/" + lmap(pick(logEvent.tags, keys(this.channelFields)), function(value, key){
        return key + ":" + value;
      }).join("/");
      return this.client.publish(channelName, JSON.stringify((ref$ = import$(logEvent.data, logEvent.tags), ref$.msg = logEvent.msg, ref$)));
    }
  });
  db = exports.db = exports.Mongo = Backbone.Model.extend4000({
    name: 'db',
    initialize: function(settings){
      var this$ = this;
      this.settings = import$({
        name: 'log',
        collection: 'log',
        host: 'localhost',
        port: 27017,
        tail: h.Day * 30
      }, settings);
      this.mongodb = require('mongodb');
      this.db = new this.mongodb.Db(this.settings.name, new this.mongodb.Server(this.settings.host || 'localhost', this.settings.port || 27017), {
        safe: true
      });
      this.db.open();
      this.c = this.db.collection(this.settings.collection);
      this.removeTail();
      return setInterval(function(){
        return this$.removeTail();
      }, h.Hour);
    },
    removeTail: function(cb){
      var splitPoint;
      splitPoint = Math.round((new Date().getTime() - this.settings.tail) / 1000).toString(16);
      return this.c.remove({
        _id: {
          $lt: this.mongodb.ObjectId(splitPoint + "0000000000000000")
        }
      }, cb);
    },
    log: function(logEvent){
      var entry;
      entry = h.extendm({
        time: new Date()
      }, logEvent);
      if (isEmpty(entry.data)) {
        delete entry.data;
      }
      return this.c.insert(entry);
    }
  });
  Fluent = exports.Fluent = Backbone.Model.extend4000({
    name: 'fluent',
    initialize: function(settings){
      this.settings = settings != null
        ? settings
        : {
          host: 'localhost',
          name: 'logger',
          port: 24224
        };
      this.logger = require('fluent-logger');
      return this.logger.configure(os.hostname() + '.n.' + this.settings.name, {
        host: this.settings.host,
        port: this.settings.port
      });
    },
    log: function(logEvent){
      return this.logger.emit(keys(logEvent.tags).join('.'), h.extend(this.settings.extendPacket || {}, logEvent.data));
    }
  });
  Sails = exports.Sails = Backbone.Model.extend4000({
    name: 'sails',
    initialize: function(settings){
      this.settings = settings != null
        ? settings
        : {
          sails: false
        };
      if (!this.settings.sails) {
        throw "Sails instance missing";
      }
      return this.sails = this.settings.sails;
    },
    log: function(logEvent){
      this.sails.sockets.broadcast('log', 'log', logEvent);
      return this.sails.emit('log', logEvent);
    }
  });
  Udp = exports.Udp = Backbone.Model.extend4000({
    name: 'udp',
    initialize: function(settings){
      var UdpGun;
      this.settings = settings != null
        ? settings
        : {
          host: 'localhost',
          port: 6000
        };
      UdpGun = require('udp-client');
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
  Tcp = exports.Tcp = Backbone.Model.extend4000({
    name: 'tcp',
    initialize: function(settings){
      var reconnecto, nssocketClient;
      this.settings = settings != null
        ? settings
        : {
          host: 'localhost',
          port: 6001
        };
      reconnecto = require('lweb3/transports/reconnecto').reconnecto;
      nssocketClient = require('lweb3/transports/client/nssocket').nssocketClient;
      return this.connection = new reconnecto({
        defaultChannelClass: nssocketClient.extend4000({
          defaults: {
            host: this.settings.host,
            port: this.settings.port,
            logger: this.settings.logger
          }
        })
      });
    },
    log: function(logEvent){
      return this.connection.send(_.extend({
        type: 'nodelogger',
        host: this.hostname
      }, this.settings.extendPacket || {}, {
        data: logEvent.data,
        tags: logEvent.tags
      }));
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
        socket.on('close', function(){
          var ref$, ref1$;
          return ref1$ = (ref$ = this$.clients)[id], delete ref$[id], ref1$;
        });
        return socket.on('error', function(){
          var ref$, ref1$;
          return ref1$ = (ref$ = this$.clients)[id], delete ref$[id], ref1$;
        });
      });
      return server.listen(this.settings.port, this.settings.host);
    },
    log: function(logEvent){
      var this$ = this;
      try {
        return map(function(client){
          return client.write(JSON.stringify(_.extend({
            host: this$.hostname
          }, this$.settings.extendPacket || {}, {
            data: logEvent.data,
            tags: keys(logEvent.tags)
          })) + "\n");
        })(
        values(
        this.clients));
      } catch (e$) {}
    }
  });
  module.exports = import$(import$(require('./index'), require('./shared')), module.exports);
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
