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
      influx = require('influx');
      return this.client = influx(this.settings.connection);
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
          if ((ref$ = val != null ? val.constructor : void 8) === Object || ref$ === Array) {
            return JSON.stringify(val);
          } else {
            return val;
          }
        });
      };
      data = import$({
        time: new Date()
      }, flattenVals(removeForbidden(omit(import$(logEvent.data, logEvent.tags), this.tagFields))));
      tags = removeForbidden(pick(logEvent.tags, this.tagFields));
      return this.client.writePoint("log", data, tags, function(err){
        if (err) {
          return console.error("influxdb logging error", err);
        }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL3Jlc2JvdS9jb3JlL25vZGVfbW9kdWxlcy9sb2dnZXIzL3NlcnZlci5scyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztFQU1FLElBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEVBQWUsSUFBZixDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVUsR0FBVixFQUFxQixJQUFyQixDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXFCLElBQXJCLEVBQTJCLE1BQTNCLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMkIsTUFBM0IsRUFBbUMsT0FBbkMsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFtQyxPQUFuQyxFQUE0QyxZQUE1QyxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTRDLFlBQTVDLEVBQTBELElBQTFELENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMEQsSUFBMUQsRUFBZ0UsSUFBaEUsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFnRSxJQUFoRSxFQUFzRSxPQUF0RSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXNFLE9BQXRFLEVBQStFLFNBQS9FLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBK0U7RUFFL0UsR0FBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQTtFQUNBLE1BQUEsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFFBQUE7RUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBO0VBQ0EsSUFBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQTtFQUVTLENBQVQsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFNBQUE7RUFFYyxRQUFkLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBO0VBQ2tCLGVBQWxCLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQTtFQUNZLENBQVosQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFlBQUE7RUFHRixJQUFBLEdBQTRELE9BQTVELENBQW9FLFlBQUEsQ0FBcEUsRUFB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QUE1QixJQUE0QixFQUF0QixJQUFzQixDQUFqQixRQUFRLENBQUMsSUFBVCxDQUFpQjtBQUFBLFVBQW5ELENBQXJELENBQVYsQ0FBa0gsQ0FBQSxDQUFBLENBQU0sSUFBdEk7U0FEUjtRQURKO1FBREwsSUFBQyxDQUFBOzs7RUFkTCxDQUFBO0VBbUJGLE1BQU0sQ0FBQyxPQUFRLENBQUEsQ0FBQSxpQkFBRSxRQUFRLFNBQUQsR0FBZ0IsUUFBUSxVQUFELElBQWlCLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMgYXV0b2NvbXBpbGVcbiNcbiMgdGhpcyBzaG91bGQgdXNlIHNvbWUgcGx1Z2luIHN5c3RlbS4gZGlmZmVyZW50IG91dHB1dHMgaGF2ZSB2ZXJ5IGRpZmZlcm5ldCBhbmQgYmVlZnkgZGVwZW5kZW5jaWVzXG4jIGNoZWNrIGxlZ28gYnV0IGFsc28gaHR0cHM6Ly9naXRodWIuY29tL2M5L2FyY2hpdGVjdFxuXG5yZXF1aXJlISB7IFxuICBsb2Rhc2g6IHsgbWFwOiBsbWFwLCBrZXlzLCB2YWx1ZXMsIGlzRW1wdHksIGRlZmF1bHRzRGVlcCwgcGljaywgb21pdCwgbWFwS2V5cywgbWFwVmFsdWVzIH1cbiAgXG4gIG5ldFxuICBjb2xvcnNcbiAgb3NcbiAgdXRpbFxuXG4gIGhlbHBlcnM6IGhcblxuICBiYWNrYm9uZTQwMDA6IEJhY2tib25lICBcbiAgc3Vic2NyaXB0aW9ubWFuMjogc3Vic2NyaXB0aW9uTWFuXG4gIHVuZGVyc2NvcmU6ICdfJ1xufVxuXG57b2JqLXRvLXBhaXJzLCBtYXAsIGZvbGQxLCBrZXlzLCB2YWx1ZXMsIGZpcnN0LCBmbGF0dGVuIH0gPSByZXF1aXJlICdwcmVsdWRlLWxzJ1xuXG5cblxuaGFzaENvbG9ycyA9IFsgY29sb3JzLmdyZWVuLCBjb2xvcnMucmFpbmJvdywgY29sb3JzLnllbGxvdywgY29sb3JzLnJlZCwgY29sb3JzLmJsdWUsIGNvbG9ycy5jeWFuLCBjb2xvcnMubWFnZW50YSwgY29sb3JzLmdyZXksIGNvbG9ycy53aGl0ZSBdXG5cbmV4cG9ydHMuQ29uc29sZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDQwMDAgZG9cbiAgICBuYW1lOiAnY29uc29sZSdcbiAgICBpbml0aWFsaXplOiAtPiBAc3RhcnRUaW1lID0gcHJvY2Vzcy5ocnRpbWUoKVswXVxuICAgIHBhcnNlVGFnczogKHRhZ3MpIC0+XG4gICAgICB0YWdzXG4gICAgICB8PiBvYmotdG8tcGFpcnNcbiAgICAgIHw+IG1hcCAoW3RhZywgdmFsdWVdKSAtPlxuICAgICAgICBcbiAgICAgICAgcGFpbnRTdHJpbmcgPSAodmFsdWUsIG5hbWUpIC0+XG4gICAgICAgICAgaWYgdmFsdWUgaW4gPFsgZmFpbCBlcnJvciBlcnIgd2FybmluZyB3YXJuIF0+IHRoZW4gcmV0dXJuIGNvbG9ycy5yZWQgdmFsdWVcbiAgICAgICAgICBpZiB2YWx1ZSBpbiA8WyBkb25lIHBhc3Mgb2sgc3VjY2VzcyBjb21wbGV0ZWQgXT4gdGhlbiByZXR1cm4gY29sb3JzLmdyZWVuIHZhbHVlXG4gICAgICAgICAgaWYgdmFsdWUgaW4gPFsgZXhlYyB0YXNrIF0+IHRoZW4gcmV0dXJuIGNvbG9ycy5tYWdlbnRhIHZhbHVlXG4gICAgICAgICAgaWYgdmFsdWUgaW4gPFsgR0VUIFBPU1QgbG9naW4gaW4gb3V0IHNraXBdPiB0aGVuIHJldHVybiBjb2xvcnMubWFnZW50YSB2YWx1ZVxuICAgICAgICAgIGlmIG5hbWUgaXMgJ3BpZCcgdGhlbiB2YWx1ZSA9IGhhc2hDb2xvcnNbIE51bWJlcih2YWx1ZSkgJSBoYXNoQ29sb3JzLmxlbmd0aCBdIFN0cmluZyB2YWx1ZVxuICAgICAgICAgIHJldHVybiBjb2xvcnMueWVsbG93IHZhbHVlXG5cbiAgICAgICAgaWYgdmFsdWUgaXMgdHJ1ZSB0aGVuIHBhaW50U3RyaW5nIHRhZ1xuICAgICAgICBlbHNlIFwiI3tjb2xvcnMuZ3JheSB0YWd9OiN7cGFpbnRTdHJpbmcgdmFsdWUsIHRhZ31cIlxuXG4gICAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZSgpXG4gICAgICB0YWdzID0gQHBhcnNlVGFncyBsb2dFdmVudC50YWdzXG4gICAgICBjb25zb2xlLmxvZyBjb2xvcnMubWFnZW50YShwcm9jZXNzLnBpZCksIGNvbG9ycy5ncmVlbihcIiN7aHJ0aW1lWzBdICAtIEBzdGFydFRpbWV9LiN7aHJ0aW1lWzFdfVwiKSArIFwiXFx0IFwiICsgdGFncy5qb2luKCcsICcpICsgXCJcXHRcIiArIChsb2dFdmVudC5tc2cgb3IgXCItXCIpXG5cblxuSW5mbHV4ID0gZXhwb3J0cy5JbmZsdXggPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICdpbmZsdXgnXG4gIGluaXRpYWxpemU6IChzZXR0aW5ncz17fSkgLT5cblxuICAgIEBzZXR0aW5ncyA9IGRvXG4gICAgICBjb25uZWN0aW9uOiBcbiAgICAgICAgaG9zdDogJ2xvY2FsaG9zdCdcbiAgICAgICAgcG9ydDogODA4NlxuICAgICAgICBwcm90b2NvbDogJ2h0dHAnXG4gICAgICAgIHVzZXJuYW1lOiAnbm9kZSdcbiAgICAgICAgZGF0YWJhc2U6ICdsb2dnZXInXG4gICAgICAgIFxuICAgICAgdGFnRmllbGRzOiB7ICttb2R1bGUsICthcHAgfVxuXG4gICAgQHNldHRpbmdzID0gZGVmYXVsdHNEZWVwIHNldHRpbmdzLCBAc2V0dGluZ3NcblxuICAgIEB0YWdGaWVsZHMgPSBrZXlzIEBzZXR0aW5ncy50YWdGaWVsZHNcbiAgICAgICAgICAgIFxuICAgIGluZmx1eCA9IHJlcXVpcmUgJ2luZmx1eCdcbiAgICBAY2xpZW50ID0gaW5mbHV4IEBzZXR0aW5ncy5jb25uZWN0aW9uXG5cbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgI0BjbGllbnQud3JpdGVQb2ludChzZXJpZXNOYW1lLCB2YWx1ZXMsIHRhZ3MsIFtvcHRpb25zXSwgZnVuY3Rpb24oZXJyLCByZXNwb25zZSkgeyB9KVxuICAgIHJlbW92ZUZvcmJpZGRlbiA9IC0+IFxuICAgICAgZm9yYmlkZGVuS2V5cyA9IHsgK3RpbWUsICttZWFzdXJlbWVudCB9XG4gICAgICBtYXBLZXlzIGl0LCAodmFsLGtleSkgLT4gaWYgZm9yYmlkZGVuS2V5c1sga2V5IF0gdGhlbiBcIl9cIiArIGtleSBlbHNlIGtleVxuXG4gICAgZmxhdHRlblZhbHMgPSAtPlxuICAgICAgbWFwVmFsdWVzIGl0LCAodmFsLGtleSkgLT5cbiAgICAgICAgaWYgdmFsP0BAIGluIFsgT2JqZWN0LCBBcnJheSBdIHRoZW4gSlNPTi5zdHJpbmdpZnkgdmFsXG4gICAgICAgIGVsc2UgdmFsXG4gICAgICBcbiAgICBkYXRhID0geyB0aW1lOiBuZXcgRGF0ZSgpIH0gPDw8IChmbGF0dGVuVmFscyByZW1vdmVGb3JiaWRkZW4gb21pdCAobG9nRXZlbnQuZGF0YSA8PDwgbG9nRXZlbnQudGFncyksIEB0YWdGaWVsZHMpXG4gICAgdGFncyA9IHJlbW92ZUZvcmJpZGRlbiBwaWNrIGxvZ0V2ZW50LnRhZ3MsIEB0YWdGaWVsZHNcbiAgICBcbiMgICAgY29uc29sZS5sb2cgY29sb3JzLmdyZWVuKCdsb2cnKSwgeyBkYXRhOiBkYXRhLCB0YWdzOiB0YWdzIH1cblxuICAgIEBjbGllbnQud3JpdGVQb2ludCBkb1xuICAgICAgXCJsb2dcIlxuICAgICAgZGF0YVxuICAgICAgdGFnc1xuICAgICAgKGVycikgLT4gaWYgZXJyIHRoZW4gY29uc29sZS5lcnJvciBcImluZmx1eGRiIGxvZ2dpbmcgZXJyb3JcIiwgZXJyXG4gICAgXG5cbnJlZGlzID0gZXhwb3J0cy5SZWRpcyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDQwMDAgZG9cbiAgbmFtZTogJ3JlZGlzJ1xuICBpbml0aWFsaXplOiAoc2V0dGluZ3M9e30pIC0+XG4gICAgXG4gICAgQHNldHRpbmdzID0gZG9cbiAgICAgIGNvbm5lY3Rpb246IFxuICAgICAgICBob3N0OiAnbG9jYWxob3N0J1xuICAgICAgICBwb3J0OiA2Mzc5XG4gICAgICAgIFxuICAgICAgY2hhbm5lbDogJ2xvZydcbiAgICAgIGNoYW5uZWxGaWVsZHM6IHsgK3BpZCwgK21vZHVsZSwgK2FwcCB9XG5cbiAgICBAc2V0dGluZ3MgPSBkZWZhdWx0c0RlZXAgc2V0dGluZ3MsIEBzZXR0aW5nc1xuXG4gICAgQCA8PDwgQHNldHRpbmdzeyBjaGFubmVsLCBjaGFubmVsRmllbGRzIH1cbiAgICBcbiAgICByZWRpcyA9IHJlcXVpcmUgJ3JlZGlzJ1xuICAgIEBjbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQgQHNldHRpbmdzLmNvbm5lY3Rpb25cbiAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgY2hhbm5lbE5hbWUgPSBAY2hhbm5lbCArIFwiL1wiICsgKGxtYXAgZG9cbiAgICAgIChwaWNrIGxvZ0V2ZW50LnRhZ3MsIGtleXMgQGNoYW5uZWxGaWVsZHMpXG4gICAgICAodmFsdWUsIGtleSkgLT4ga2V5ICsgXCI6XCIgKyB2YWx1ZVxuICAgICAgKS5qb2luIFwiL1wiXG4gICAgICBcbiAgICBAY2xpZW50LnB1Ymxpc2ggZG9cbiAgICAgIGNoYW5uZWxOYW1lXG4gICAgICBKU09OLnN0cmluZ2lmeSBsb2dFdmVudC5kYXRhIDw8PCBsb2dFdmVudC50YWdzIDw8PCBtc2c6IGxvZ0V2ZW50Lm1zZ1xuXG4gICAgXG5kYiA9IGV4cG9ydHMuZGIgPSBleHBvcnRzLk1vbmdvID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMCBkb1xuICBuYW1lOiAnZGInXG4gIGluaXRpYWxpemU6IChzZXR0aW5ncykgLT5cbiAgICBAc2V0dGluZ3MgPSAgeyBuYW1lOiAnbG9nJywgY29sbGVjdGlvbjogJ2xvZycsIGhvc3Q6ICdsb2NhbGhvc3QnLCBwb3J0OiAyNzAxNywgdGFpbDogaC5EYXkgKiAzMCB9IDw8PCBzZXR0aW5nc1xuICAgIEBtb25nb2RiID0gcmVxdWlyZSAnbW9uZ29kYidcbiAgICBcbiAgICBAZGIgPSBuZXcgQG1vbmdvZGIuRGIgQHNldHRpbmdzLm5hbWUsIG5ldyBAbW9uZ29kYi5TZXJ2ZXIoQHNldHRpbmdzLmhvc3Qgb3IgJ2xvY2FsaG9zdCcsIEBzZXR0aW5ncy5wb3J0IG9yIDI3MDE3KSwgc2FmZTogdHJ1ZVxuICAgIEBkYi5vcGVuKClcbiAgICBAYyA9IEBkYi5jb2xsZWN0aW9uIEBzZXR0aW5ncy5jb2xsZWN0aW9uXG5cbiAgICBAcmVtb3ZlVGFpbCgpXG4gICAgc2V0SW50ZXJ2YWwgKH4+IEByZW1vdmVUYWlsKCkpLCBoLkhvdXJcbiAgICAgIFxuICByZW1vdmVUYWlsOiAoY2IpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgucm91bmQoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gQHNldHRpbmdzLnRhaWwpIC8gMTAwMCkudG9TdHJpbmcoMTYpXG4gICAgQGMucmVtb3ZlIHsgX2lkOiB7ICRsdDogQG1vbmdvZGIuT2JqZWN0SWQoc3BsaXRQb2ludCArIFwiMDAwMDAwMDAwMDAwMDAwMFwiKSB9IH0sIGNiXG4gICAgICAgICAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgZW50cnkgPSBoLmV4dGVuZG0geyB0aW1lOiBuZXcgRGF0ZSgpIH0sIGxvZ0V2ZW50XG4gICAgaWYgaXNFbXB0eSBlbnRyeS5kYXRhIHRoZW4gZGVsZXRlIGVudHJ5LmRhdGFcbiAgICBAYy5pbnNlcnQgZW50cnlcblxuRmx1ZW50ID0gZXhwb3J0cy5GbHVlbnQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICdmbHVlbnQnXG4gIGluaXRpYWxpemU6IChAc2V0dGluZ3MgPSB7IGhvc3Q6ICdsb2NhbGhvc3QnLCBuYW1lOiAnbG9nZ2VyJywgcG9ydDogMjQyMjQgfSApIC0+XG4gICAgQGxvZ2dlciA9IHJlcXVpcmUgJ2ZsdWVudC1sb2dnZXInXG4gICAgQGxvZ2dlci5jb25maWd1cmUgb3MuaG9zdG5hbWUoKSArICcubi4nICsgQHNldHRpbmdzLm5hbWUsIHsgaG9zdDogQHNldHRpbmdzLmhvc3QsIHBvcnQ6IEBzZXR0aW5ncy5wb3J0IH1cbiAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgQGxvZ2dlci5lbWl0IGtleXMobG9nRXZlbnQudGFncykuam9pbignLicpLCBoLmV4dGVuZCAoQHNldHRpbmdzLmV4dGVuZFBhY2tldCBvciB7fSksIGxvZ0V2ZW50LmRhdGFcblxuXG5TYWlscyA9IGV4cG9ydHMuU2FpbHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICdzYWlscydcbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgc2FpbHM6IGZhbHNlIH0gKSAtPlxuICAgIGlmIG5vdCBAc2V0dGluZ3Muc2FpbHMgdGhlbiB0aHJvdyBcIlNhaWxzIGluc3RhbmNlIG1pc3NpbmdcIlxuICAgIEBzYWlscyA9IEBzZXR0aW5ncy5zYWlsc1xuICAgIFxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAc2FpbHMuc29ja2V0cy5icm9hZGNhc3QgJ2xvZycsICdsb2cnLCBsb2dFdmVudFxuICAgIEBzYWlscy5lbWl0ICdsb2cnLCBsb2dFdmVudFxuICAgIFxuVWRwID0gZXhwb3J0cy5VZHAgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICd1ZHAnXG5cbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgaG9zdDogJ2xvY2FsaG9zdCcsIHBvcnQ6IDYwMDAgfSApIC0+XG4gICAgVWRwR3VuID0gcmVxdWlyZSAndWRwLWNsaWVudCdcblxuICAgIEBndW4gPSBuZXcgVWRwR3VuIEBzZXR0aW5ncy5wb3J0LCBAc2V0dGluZ3MuaG9zdFxuICAgIEBob3N0bmFtZSA9IG9zLmhvc3RuYW1lKClcblxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAZ3VuLnNlbmQgbmV3IEJ1ZmZlciBKU09OLnN0cmluZ2lmeSBfLmV4dGVuZCB7IHR5cGU6ICdub2RlbG9nZ2VyJywgaG9zdDogQGhvc3RuYW1lIH0sIChAc2V0dGluZ3MuZXh0ZW5kUGFja2V0IG9yIHt9KSwgeyBkYXRhOiBsb2dFdmVudC5kYXRhLCB0YWdzOiBrZXlzIGxvZ0V2ZW50LnRhZ3MgfVxuXG5cblRjcCA9IGV4cG9ydHMuVGNwID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMCBkb1xuICBuYW1lOiAndGNwJ1xuICBpbml0aWFsaXplOiAoQHNldHRpbmdzID0geyBob3N0OiAnbG9jYWxob3N0JywgcG9ydDogNjAwMSB9ICkgLT5cbiAgICBcbiAgICByZWNvbm5lY3RvID0gcmVxdWlyZSgnbHdlYjMvdHJhbnNwb3J0cy9yZWNvbm5lY3RvJykucmVjb25uZWN0b1xuICAgIG5zc29ja2V0Q2xpZW50ID0gcmVxdWlyZSgnbHdlYjMvdHJhbnNwb3J0cy9jbGllbnQvbnNzb2NrZXQnKS5uc3NvY2tldENsaWVudFxuXG4gICAgQGNvbm5lY3Rpb24gPSBuZXcgcmVjb25uZWN0byBkb1xuICAgICAgZGVmYXVsdENoYW5uZWxDbGFzczogbnNzb2NrZXRDbGllbnQuZXh0ZW5kNDAwMCBkb1xuICAgICAgICBkZWZhdWx0czpcbiAgICAgICAgICBob3N0OiBAc2V0dGluZ3MuaG9zdFxuICAgICAgICAgIHBvcnQ6IEBzZXR0aW5ncy5wb3J0XG4gICAgICAgICAgbG9nZ2VyOiBAc2V0dGluZ3MubG9nZ2VyXG4gIFxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAY29ubmVjdGlvbi5zZW5kIF8uZXh0ZW5kIHsgdHlwZTogJ25vZGVsb2dnZXInLCBob3N0OiBAaG9zdG5hbWUgfSwgKEBzZXR0aW5ncy5leHRlbmRQYWNrZXQgb3Ige30pLCB7IGRhdGE6IGxvZ0V2ZW50LmRhdGEsIHRhZ3M6IGxvZ0V2ZW50LnRhZ3MgfVxuICAgIFxudGNwU2VydmVyID0gZXhwb3J0cy50Y3BTZXJ2ZXIgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICd0Y3BTZXJ2ZXInXG5cbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgcG9ydDogNzAwMCwgaG9zdDogJzAuMC4wLjAnIH0gKSAtPlxuICAgIGNudCA9IDBcbiAgICBAY2xpZW50cyA9IHt9XG4gICAgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlciAoc29ja2V0KSB+PlxuICAgICAgaWQgPSBjbnQrK1xuICAgICAgQGNsaWVudHNbaWRdID0gc29ja2V0XG4gICAgICBzb2NrZXQub24gJ2Nsb3NlJywgfj4gZGVsZXRlIEBjbGllbnRzW2lkXVxuICAgICAgc29ja2V0Lm9uICdlcnJvcicsIH4+IGRlbGV0ZSBAY2xpZW50c1tpZF1cbiAgICBzZXJ2ZXIubGlzdGVuIEBzZXR0aW5ncy5wb3J0LCBAc2V0dGluZ3MuaG9zdFxuXG4gIGxvZzogKGxvZ0V2ZW50KSAtPlxuICAgIHRyeVxuICAgICAgQGNsaWVudHNcbiAgICAgICAgfD4gdmFsdWVzXG4gICAgICAgIHw+IG1hcCAoY2xpZW50KSB+PlxuICAgICAgICAgIGNsaWVudC53cml0ZSBKU09OLnN0cmluZ2lmeShfLmV4dGVuZCB7IGhvc3Q6IEBob3N0bmFtZSB9LCAoQHNldHRpbmdzLmV4dGVuZFBhY2tldCBvciB7fSksIHsgZGF0YTogbG9nRXZlbnQuZGF0YSwgdGFnczoga2V5cyBsb2dFdmVudC50YWdzIH0pICsgXCJcXG5cIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaW5kZXgnKSA8PDwgcmVxdWlyZSgnLi9zaGFyZWQnKSA8PDwgbW9kdWxlLmV4cG9ydHNcbiJdfQ==
