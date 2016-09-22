(function(){
  var ref$, map, keys, values, isEmpty, defaultsDeep, pick, net, colors, os, util, h, Backbone, subscriptionMan, _, Influx, redis, db, Fluent, Sails, Udp, Tcp, tcpServer;
  ref$ = require('lodash'), map = ref$.map, keys = ref$.keys, values = ref$.values, isEmpty = ref$.isEmpty, defaultsDeep = ref$.defaultsDeep, pick = ref$.pick;
  net = require('net');
  colors = require('colors');
  os = require('os');
  util = require('util');
  h = require('helpers');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  _ = require('underscore');
  module.exports = import$(require('./index'), require('./shared'));
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
        series: 'log',
        tagFields: {
          module: true,
          app: true
        }
      };
      this.settings = defaultsDeep(settings, this.settings);
      console.log(this.settings);
      this.series = this.settings.series;
      this.tagFields = keys(this.settings.tagFields);
      influx = require('influx');
      return this.client = influx(this.settings.connection);
    },
    log: function(logEvent){
      console.log(logEvent);
      return this.client.writePoint(this.series, import$(logEvent.data, logEvent.tags), pick(logEvent.tags, this.tagFields), function(err, res){
        return console.log(err, res);
      });
    }
  });
  redis = exports.redis = Backbone.Model.extend4000({
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
      var channelName;
      channelName = this.channel + "-" + map(pick(logEvent.tags, this.channelFields), function(value, key){
        return key + ":" + value;
      }).join("-");
      return this.client.publish(channelName, JSON.stringify(import$(logEvent.data, logEvent.tags)));
    }
  });
  db = exports.db = Backbone.Model.extend4000({
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
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
