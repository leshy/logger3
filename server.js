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
          if (val == null) {
            return "";
          }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL3Jlc2JvdS9jb3JlL25vZGVfbW9kdWxlcy9sb2dnZXIzL3NlcnZlci5scyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztFQU1FLElBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEVBQWUsSUFBZixDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVUsR0FBVixFQUFxQixJQUFyQixDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXFCLElBQXJCLEVBQTJCLE1BQTNCLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMkIsTUFBM0IsRUFBbUMsT0FBbkMsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFtQyxPQUFuQyxFQUE0QyxZQUE1QyxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTRDLFlBQTVDLEVBQTBELElBQTFELENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMEQsSUFBMUQsRUFBZ0UsSUFBaEUsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFnRSxJQUFoRSxFQUFzRSxPQUF0RSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXNFLE9BQXRFLEVBQStFLFNBQS9FLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBK0U7RUFFL0UsR0FBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQTtFQUNBLE1BQUEsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFFBQUE7RUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBO0VBQ0EsSUFBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQTtFQUVTLENBQVQsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFNBQUE7RUFFYyxRQUFkLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBO0VBQ2tCLGVBQWxCLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQTtFQUNZLENBQVosQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFlBQUE7RUFHRixJQUFBLEdBQTRELE9BQTVELENBQW9FLFlBQUEsQ0FBcEUsRUFB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QWpELElBQWlELEVBQTNDLFFBQVEsQ0FBQyxJQUFrQyxDQUFBO0FBQUEsWUFBNUIsSUFBNEIsRUFBdEIsSUFBc0IsQ0FBakIsUUFBUSxDQUFDLElBQVQsQ0FBaUI7QUFBQSxVQUFuRCxDQUFyRCxDQUFWLENBQWtILENBQUEsQ0FBQSxDQUFNLElBQXRJO1NBRFI7UUFESjtRQURMLElBQUMsQ0FBQTs7O0VBZEwsQ0FBQTtFQW1CRixNQUFNLENBQUMsT0FBUSxDQUFBLENBQUEsaUJBQUUsUUFBUSxTQUFELEdBQWdCLFFBQVEsVUFBRCxJQUFpQixNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIGF1dG9jb21waWxlXG4jXG4jIHRoaXMgc2hvdWxkIHVzZSBzb21lIHBsdWdpbiBzeXN0ZW0uIGRpZmZlcmVudCBvdXRwdXRzIGhhdmUgdmVyeSBkaWZmZXJuZXQgYW5kIGJlZWZ5IGRlcGVuZGVuY2llc1xuIyBjaGVjayBsZWdvIGJ1dCBhbHNvIGh0dHBzOi8vZ2l0aHViLmNvbS9jOS9hcmNoaXRlY3RcblxucmVxdWlyZSEgeyBcbiAgbG9kYXNoOiB7IG1hcDogbG1hcCwga2V5cywgdmFsdWVzLCBpc0VtcHR5LCBkZWZhdWx0c0RlZXAsIHBpY2ssIG9taXQsIG1hcEtleXMsIG1hcFZhbHVlcyB9XG4gIFxuICBuZXRcbiAgY29sb3JzXG4gIG9zXG4gIHV0aWxcblxuICBoZWxwZXJzOiBoXG5cbiAgYmFja2JvbmU0MDAwOiBCYWNrYm9uZSAgXG4gIHN1YnNjcmlwdGlvbm1hbjI6IHN1YnNjcmlwdGlvbk1hblxuICB1bmRlcnNjb3JlOiAnXydcbn1cblxue29iai10by1wYWlycywgbWFwLCBmb2xkMSwga2V5cywgdmFsdWVzLCBmaXJzdCwgZmxhdHRlbiB9ID0gcmVxdWlyZSAncHJlbHVkZS1scydcblxuXG5cbmhhc2hDb2xvcnMgPSBbIGNvbG9ycy5ncmVlbiwgY29sb3JzLnJhaW5ib3csIGNvbG9ycy55ZWxsb3csIGNvbG9ycy5yZWQsIGNvbG9ycy5ibHVlLCBjb2xvcnMuY3lhbiwgY29sb3JzLm1hZ2VudGEsIGNvbG9ycy5ncmV5LCBjb2xvcnMud2hpdGUgXVxuXG5leHBvcnRzLkNvbnNvbGUgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gICAgbmFtZTogJ2NvbnNvbGUnXG4gICAgaW5pdGlhbGl6ZTogLT4gQHN0YXJ0VGltZSA9IHByb2Nlc3MuaHJ0aW1lKClbMF1cbiAgICBwYXJzZVRhZ3M6ICh0YWdzKSAtPlxuICAgICAgdGFnc1xuICAgICAgfD4gb2JqLXRvLXBhaXJzXG4gICAgICB8PiBtYXAgKFt0YWcsIHZhbHVlXSkgLT5cbiAgICAgICAgXG4gICAgICAgIHBhaW50U3RyaW5nID0gKHZhbHVlLCBuYW1lKSAtPlxuICAgICAgICAgIGlmIHZhbHVlIGluIDxbIGZhaWwgZXJyb3IgZXJyIHdhcm5pbmcgd2FybiBdPiB0aGVuIHJldHVybiBjb2xvcnMucmVkIHZhbHVlXG4gICAgICAgICAgaWYgdmFsdWUgaW4gPFsgZG9uZSBwYXNzIG9rIHN1Y2Nlc3MgY29tcGxldGVkIF0+IHRoZW4gcmV0dXJuIGNvbG9ycy5ncmVlbiB2YWx1ZVxuICAgICAgICAgIGlmIHZhbHVlIGluIDxbIGV4ZWMgdGFzayBdPiB0aGVuIHJldHVybiBjb2xvcnMubWFnZW50YSB2YWx1ZVxuICAgICAgICAgIGlmIHZhbHVlIGluIDxbIEdFVCBQT1NUIGxvZ2luIGluIG91dCBza2lwXT4gdGhlbiByZXR1cm4gY29sb3JzLm1hZ2VudGEgdmFsdWVcbiAgICAgICAgICBpZiBuYW1lIGlzICdwaWQnIHRoZW4gdmFsdWUgPSBoYXNoQ29sb3JzWyBOdW1iZXIodmFsdWUpICUgaGFzaENvbG9ycy5sZW5ndGggXSBTdHJpbmcgdmFsdWVcbiAgICAgICAgICByZXR1cm4gY29sb3JzLnllbGxvdyB2YWx1ZVxuXG4gICAgICAgIGlmIHZhbHVlIGlzIHRydWUgdGhlbiBwYWludFN0cmluZyB0YWdcbiAgICAgICAgZWxzZSBcIiN7Y29sb3JzLmdyYXkgdGFnfToje3BhaW50U3RyaW5nIHZhbHVlLCB0YWd9XCJcblxuICAgIGxvZzogKGxvZ0V2ZW50KSAtPlxuICAgICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWUoKVxuICAgICAgdGFncyA9IEBwYXJzZVRhZ3MgbG9nRXZlbnQudGFnc1xuICAgICAgY29uc29sZS5sb2cgY29sb3JzLm1hZ2VudGEocHJvY2Vzcy5waWQpLCBjb2xvcnMuZ3JlZW4oXCIje2hydGltZVswXSAgLSBAc3RhcnRUaW1lfS4je2hydGltZVsxXX1cIikgKyBcIlxcdCBcIiArIHRhZ3Muam9pbignLCAnKSArIFwiXFx0XCIgKyAobG9nRXZlbnQubXNnIG9yIFwiLVwiKVxuXG5cbkluZmx1eCA9IGV4cG9ydHMuSW5mbHV4ID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMCBkb1xuICBuYW1lOiAnaW5mbHV4J1xuICBpbml0aWFsaXplOiAoc2V0dGluZ3M9e30pIC0+XG5cbiAgICBAc2V0dGluZ3MgPSBkb1xuICAgICAgY29ubmVjdGlvbjogXG4gICAgICAgIGhvc3Q6ICdsb2NhbGhvc3QnXG4gICAgICAgIHBvcnQ6IDgwODZcbiAgICAgICAgcHJvdG9jb2w6ICdodHRwJ1xuICAgICAgICB1c2VybmFtZTogJ25vZGUnXG4gICAgICAgIGRhdGFiYXNlOiAnbG9nZ2VyJ1xuICAgICAgICBcbiAgICAgIHRhZ0ZpZWxkczogeyArbW9kdWxlLCArYXBwIH1cblxuICAgIEBzZXR0aW5ncyA9IGRlZmF1bHRzRGVlcCBzZXR0aW5ncywgQHNldHRpbmdzXG5cbiAgICBAdGFnRmllbGRzID0ga2V5cyBAc2V0dGluZ3MudGFnRmllbGRzXG4gICAgICAgICAgICBcbiAgICBpbmZsdXggPSByZXF1aXJlICdpbmZsdXgnXG4gICAgQGNsaWVudCA9IGluZmx1eCBAc2V0dGluZ3MuY29ubmVjdGlvblxuXG4gIGxvZzogKGxvZ0V2ZW50KSAtPlxuICAgICNAY2xpZW50LndyaXRlUG9pbnQoc2VyaWVzTmFtZSwgdmFsdWVzLCB0YWdzLCBbb3B0aW9uc10sIGZ1bmN0aW9uKGVyciwgcmVzcG9uc2UpIHsgfSlcbiAgICByZW1vdmVGb3JiaWRkZW4gPSAtPiBcbiAgICAgIGZvcmJpZGRlbktleXMgPSB7ICt0aW1lLCArbWVhc3VyZW1lbnQgfVxuICAgICAgbWFwS2V5cyBpdCwgKHZhbCxrZXkpIC0+IGlmIGZvcmJpZGRlbktleXNbIGtleSBdIHRoZW4gXCJfXCIgKyBrZXkgZWxzZSBrZXlcblxuICAgIGZsYXR0ZW5WYWxzID0gLT5cbiAgICAgIG1hcFZhbHVlcyBpdCwgKHZhbCxrZXkpIC0+XG4gICAgICAgIGlmIG5vdCB2YWw/IHRoZW4gcmV0dXJuIFwiXCJcbiAgICAgICAgaWYgdmFsP0BAIGluIFsgT2JqZWN0LCBBcnJheSBdIHRoZW4gSlNPTi5zdHJpbmdpZnkgdmFsXG4gICAgICAgIGVsc2UgdmFsXG4gICAgICBcbiAgICBkYXRhID0geyB0aW1lOiBuZXcgRGF0ZSgpIH0gPDw8IChmbGF0dGVuVmFscyByZW1vdmVGb3JiaWRkZW4gb21pdCAobG9nRXZlbnQuZGF0YSA8PDwgbG9nRXZlbnQudGFncyksIEB0YWdGaWVsZHMpXG4gICAgdGFncyA9IHJlbW92ZUZvcmJpZGRlbiBwaWNrIGxvZ0V2ZW50LnRhZ3MsIEB0YWdGaWVsZHNcbiAgICBcbiMgICAgY29uc29sZS5sb2cgY29sb3JzLmdyZWVuKCdsb2cnKSwgeyBkYXRhOiBkYXRhLCB0YWdzOiB0YWdzIH1cblxuICAgIEBjbGllbnQud3JpdGVQb2ludCBkb1xuICAgICAgXCJsb2dcIlxuICAgICAgZGF0YVxuICAgICAgdGFnc1xuICAgICAgKGVycikgLT4gaWYgZXJyIHRoZW4gY29uc29sZS5lcnJvciBcImluZmx1eGRiIGxvZ2dpbmcgZXJyb3JcIiwgZXJyXG4gICAgXG5cbnJlZGlzID0gZXhwb3J0cy5SZWRpcyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDQwMDAgZG9cbiAgbmFtZTogJ3JlZGlzJ1xuICBpbml0aWFsaXplOiAoc2V0dGluZ3M9e30pIC0+XG4gICAgXG4gICAgQHNldHRpbmdzID0gZG9cbiAgICAgIGNvbm5lY3Rpb246IFxuICAgICAgICBob3N0OiAnbG9jYWxob3N0J1xuICAgICAgICBwb3J0OiA2Mzc5XG4gICAgICAgIFxuICAgICAgY2hhbm5lbDogJ2xvZydcbiAgICAgIGNoYW5uZWxGaWVsZHM6IHsgK3BpZCwgK21vZHVsZSwgK2FwcCB9XG5cbiAgICBAc2V0dGluZ3MgPSBkZWZhdWx0c0RlZXAgc2V0dGluZ3MsIEBzZXR0aW5nc1xuXG4gICAgQCA8PDwgQHNldHRpbmdzeyBjaGFubmVsLCBjaGFubmVsRmllbGRzIH1cbiAgICBcbiAgICByZWRpcyA9IHJlcXVpcmUgJ3JlZGlzJ1xuICAgIEBjbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQgQHNldHRpbmdzLmNvbm5lY3Rpb25cbiAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgY2hhbm5lbE5hbWUgPSBAY2hhbm5lbCArIFwiL1wiICsgKGxtYXAgZG9cbiAgICAgIChwaWNrIGxvZ0V2ZW50LnRhZ3MsIGtleXMgQGNoYW5uZWxGaWVsZHMpXG4gICAgICAodmFsdWUsIGtleSkgLT4ga2V5ICsgXCI6XCIgKyB2YWx1ZVxuICAgICAgKS5qb2luIFwiL1wiXG4gICAgICBcbiAgICBAY2xpZW50LnB1Ymxpc2ggZG9cbiAgICAgIGNoYW5uZWxOYW1lXG4gICAgICBKU09OLnN0cmluZ2lmeSBsb2dFdmVudC5kYXRhIDw8PCBsb2dFdmVudC50YWdzIDw8PCBtc2c6IGxvZ0V2ZW50Lm1zZ1xuXG4gICAgXG5kYiA9IGV4cG9ydHMuZGIgPSBleHBvcnRzLk1vbmdvID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMCBkb1xuICBuYW1lOiAnZGInXG4gIGluaXRpYWxpemU6IChzZXR0aW5ncykgLT5cbiAgICBAc2V0dGluZ3MgPSAgeyBuYW1lOiAnbG9nJywgY29sbGVjdGlvbjogJ2xvZycsIGhvc3Q6ICdsb2NhbGhvc3QnLCBwb3J0OiAyNzAxNywgdGFpbDogaC5EYXkgKiAzMCB9IDw8PCBzZXR0aW5nc1xuICAgIEBtb25nb2RiID0gcmVxdWlyZSAnbW9uZ29kYidcbiAgICBcbiAgICBAZGIgPSBuZXcgQG1vbmdvZGIuRGIgQHNldHRpbmdzLm5hbWUsIG5ldyBAbW9uZ29kYi5TZXJ2ZXIoQHNldHRpbmdzLmhvc3Qgb3IgJ2xvY2FsaG9zdCcsIEBzZXR0aW5ncy5wb3J0IG9yIDI3MDE3KSwgc2FmZTogdHJ1ZVxuICAgIEBkYi5vcGVuKClcbiAgICBAYyA9IEBkYi5jb2xsZWN0aW9uIEBzZXR0aW5ncy5jb2xsZWN0aW9uXG5cbiAgICBAcmVtb3ZlVGFpbCgpXG4gICAgc2V0SW50ZXJ2YWwgKH4+IEByZW1vdmVUYWlsKCkpLCBoLkhvdXJcbiAgICAgIFxuICByZW1vdmVUYWlsOiAoY2IpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgucm91bmQoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gQHNldHRpbmdzLnRhaWwpIC8gMTAwMCkudG9TdHJpbmcoMTYpXG4gICAgQGMucmVtb3ZlIHsgX2lkOiB7ICRsdDogQG1vbmdvZGIuT2JqZWN0SWQoc3BsaXRQb2ludCArIFwiMDAwMDAwMDAwMDAwMDAwMFwiKSB9IH0sIGNiXG4gICAgICAgICAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgZW50cnkgPSBoLmV4dGVuZG0geyB0aW1lOiBuZXcgRGF0ZSgpIH0sIGxvZ0V2ZW50XG4gICAgaWYgaXNFbXB0eSBlbnRyeS5kYXRhIHRoZW4gZGVsZXRlIGVudHJ5LmRhdGFcbiAgICBAYy5pbnNlcnQgZW50cnlcblxuRmx1ZW50ID0gZXhwb3J0cy5GbHVlbnQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICdmbHVlbnQnXG4gIGluaXRpYWxpemU6IChAc2V0dGluZ3MgPSB7IGhvc3Q6ICdsb2NhbGhvc3QnLCBuYW1lOiAnbG9nZ2VyJywgcG9ydDogMjQyMjQgfSApIC0+XG4gICAgQGxvZ2dlciA9IHJlcXVpcmUgJ2ZsdWVudC1sb2dnZXInXG4gICAgQGxvZ2dlci5jb25maWd1cmUgb3MuaG9zdG5hbWUoKSArICcubi4nICsgQHNldHRpbmdzLm5hbWUsIHsgaG9zdDogQHNldHRpbmdzLmhvc3QsIHBvcnQ6IEBzZXR0aW5ncy5wb3J0IH1cbiAgICBcbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgQGxvZ2dlci5lbWl0IGtleXMobG9nRXZlbnQudGFncykuam9pbignLicpLCBoLmV4dGVuZCAoQHNldHRpbmdzLmV4dGVuZFBhY2tldCBvciB7fSksIGxvZ0V2ZW50LmRhdGFcblxuXG5TYWlscyA9IGV4cG9ydHMuU2FpbHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICdzYWlscydcbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgc2FpbHM6IGZhbHNlIH0gKSAtPlxuICAgIGlmIG5vdCBAc2V0dGluZ3Muc2FpbHMgdGhlbiB0aHJvdyBcIlNhaWxzIGluc3RhbmNlIG1pc3NpbmdcIlxuICAgIEBzYWlscyA9IEBzZXR0aW5ncy5zYWlsc1xuICAgIFxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAc2FpbHMuc29ja2V0cy5icm9hZGNhc3QgJ2xvZycsICdsb2cnLCBsb2dFdmVudFxuICAgIEBzYWlscy5lbWl0ICdsb2cnLCBsb2dFdmVudFxuICAgIFxuVWRwID0gZXhwb3J0cy5VZHAgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICd1ZHAnXG5cbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgaG9zdDogJ2xvY2FsaG9zdCcsIHBvcnQ6IDYwMDAgfSApIC0+XG4gICAgVWRwR3VuID0gcmVxdWlyZSAndWRwLWNsaWVudCdcblxuICAgIEBndW4gPSBuZXcgVWRwR3VuIEBzZXR0aW5ncy5wb3J0LCBAc2V0dGluZ3MuaG9zdFxuICAgIEBob3N0bmFtZSA9IG9zLmhvc3RuYW1lKClcblxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAZ3VuLnNlbmQgbmV3IEJ1ZmZlciBKU09OLnN0cmluZ2lmeSBfLmV4dGVuZCB7IHR5cGU6ICdub2RlbG9nZ2VyJywgaG9zdDogQGhvc3RuYW1lIH0sIChAc2V0dGluZ3MuZXh0ZW5kUGFja2V0IG9yIHt9KSwgeyBkYXRhOiBsb2dFdmVudC5kYXRhLCB0YWdzOiBrZXlzIGxvZ0V2ZW50LnRhZ3MgfVxuXG5cblRjcCA9IGV4cG9ydHMuVGNwID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMCBkb1xuICBuYW1lOiAndGNwJ1xuICBpbml0aWFsaXplOiAoQHNldHRpbmdzID0geyBob3N0OiAnbG9jYWxob3N0JywgcG9ydDogNjAwMSB9ICkgLT5cbiAgICBcbiAgICByZWNvbm5lY3RvID0gcmVxdWlyZSgnbHdlYjMvdHJhbnNwb3J0cy9yZWNvbm5lY3RvJykucmVjb25uZWN0b1xuICAgIG5zc29ja2V0Q2xpZW50ID0gcmVxdWlyZSgnbHdlYjMvdHJhbnNwb3J0cy9jbGllbnQvbnNzb2NrZXQnKS5uc3NvY2tldENsaWVudFxuXG4gICAgQGNvbm5lY3Rpb24gPSBuZXcgcmVjb25uZWN0byBkb1xuICAgICAgZGVmYXVsdENoYW5uZWxDbGFzczogbnNzb2NrZXRDbGllbnQuZXh0ZW5kNDAwMCBkb1xuICAgICAgICBkZWZhdWx0czpcbiAgICAgICAgICBob3N0OiBAc2V0dGluZ3MuaG9zdFxuICAgICAgICAgIHBvcnQ6IEBzZXR0aW5ncy5wb3J0XG4gICAgICAgICAgbG9nZ2VyOiBAc2V0dGluZ3MubG9nZ2VyXG4gIFxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBAY29ubmVjdGlvbi5zZW5kIF8uZXh0ZW5kIHsgdHlwZTogJ25vZGVsb2dnZXInLCBob3N0OiBAaG9zdG5hbWUgfSwgKEBzZXR0aW5ncy5leHRlbmRQYWNrZXQgb3Ige30pLCB7IGRhdGE6IGxvZ0V2ZW50LmRhdGEsIHRhZ3M6IGxvZ0V2ZW50LnRhZ3MgfVxuICAgIFxudGNwU2VydmVyID0gZXhwb3J0cy50Y3BTZXJ2ZXIgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ0MDAwIGRvXG4gIG5hbWU6ICd0Y3BTZXJ2ZXInXG5cbiAgaW5pdGlhbGl6ZTogKEBzZXR0aW5ncyA9IHsgcG9ydDogNzAwMCwgaG9zdDogJzAuMC4wLjAnIH0gKSAtPlxuICAgIGNudCA9IDBcbiAgICBAY2xpZW50cyA9IHt9XG4gICAgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlciAoc29ja2V0KSB+PlxuICAgICAgaWQgPSBjbnQrK1xuICAgICAgQGNsaWVudHNbaWRdID0gc29ja2V0XG4gICAgICBzb2NrZXQub24gJ2Nsb3NlJywgfj4gZGVsZXRlIEBjbGllbnRzW2lkXVxuICAgICAgc29ja2V0Lm9uICdlcnJvcicsIH4+IGRlbGV0ZSBAY2xpZW50c1tpZF1cbiAgICBzZXJ2ZXIubGlzdGVuIEBzZXR0aW5ncy5wb3J0LCBAc2V0dGluZ3MuaG9zdFxuXG4gIGxvZzogKGxvZ0V2ZW50KSAtPlxuICAgIHRyeVxuICAgICAgQGNsaWVudHNcbiAgICAgICAgfD4gdmFsdWVzXG4gICAgICAgIHw+IG1hcCAoY2xpZW50KSB+PlxuICAgICAgICAgIGNsaWVudC53cml0ZSBKU09OLnN0cmluZ2lmeShfLmV4dGVuZCB7IGhvc3Q6IEBob3N0bmFtZSB9LCAoQHNldHRpbmdzLmV4dGVuZFBhY2tldCBvciB7fSksIHsgZGF0YTogbG9nRXZlbnQuZGF0YSwgdGFnczoga2V5cyBsb2dFdmVudC50YWdzIH0pICsgXCJcXG5cIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaW5kZXgnKSA8PDwgcmVxdWlyZSgnLi9zaGFyZWQnKSA8PDwgbW9kdWxlLmV4cG9ydHNcbiJdfQ==
