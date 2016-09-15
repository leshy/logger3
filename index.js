(function(){
  var ref$, objToPairs, map, fold1, keys, values, first, flatten, h, net, Backbone, subscriptionMan, _, colors, os, util, throwError, ignoreError, callable, parseTags, Logger, parseArray, Console, slice$ = [].slice;
  ref$ = require('prelude-ls'), objToPairs = ref$.objToPairs, map = ref$.map, fold1 = ref$.fold1, keys = ref$.keys, values = ref$.values, first = ref$.first, flatten = ref$.flatten;
  h = require('helpers');
  net = require('net');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  _ = require('underscore');
  colors = require('colors');
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
    var ret, x;
    ret = (function(){
      var ref$;
      switch (x = it != null ? it.constructor : void 8) {
      case undefined:
        return {};
      case String:
        return ref$ = {}, ref$[it + ""] = true, ref$;
      case Number:
        return ref$ = {}, ref$[it + ""] = true, ref$;
      case Object:
        return it.tags != null || it;
      case Array:
        return _.reduce(it, function(tags, entry){
          return import$(tags, parseTags(entry));
        }, {});
      default:
        throw Error("tags type invalid, received: " + it);
      }
    }());
    return ret;
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
          if (settings) {
            return this$.outputs.push(new exports[name](settings));
          }
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
      var contexts, ref$, this$ = this;
      contexts = slice$.call(arguments);
      if (((ref$ = first(contexts)) != null ? ref$.constructor : void 8) === String) {
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
      return map(function(arg$){
        var tag, value, paintString;
        tag = arg$[0], value = arg$[1];
        paintString = function(it){
          if (it === 'fail' || it === 'error' || it === 'err' || it === 'warning' || it === 'warn') {
            return colors.red(it);
          }
          if (it === 'done' || it === 'pass' || it === 'ok' || it === 'success' || it === 'completed') {
            return colors.green(it);
          }
          if (it === 'exec' || it === 'task') {
            return colors.magenta(it);
          }
          if (it === 'GET' || it === 'POST' || it === 'login' || it === 'in' || it === 'out' || it === 'skip') {
            return colors.magenta(it);
          }
          return colors.yellow(it);
        };
        if (value === true) {
          return paintString(tag);
        } else {
          return colors.gray(tag) + ":" + paintString(value);
        }
      })(
      objToPairs(
      tags));
    },
    log: function(logEvent){
      var hrtime, tags;
      hrtime = process.hrtime();
      tags = this.parseTags(logEvent.tags);
      return console.log(colors.green(process.pid + " " + (hrtime[0] - this.startTime) + "." + hrtime[1]) + "\t " + tags.join(', ') + "\t" + (logEvent.msg || "-"));
    }
  });
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL3Jlc2JvdS9ib29raW5nY29tQ2xpZW50L25vZGVfbW9kdWxlcy9sb2dnZXIzL2luZGV4LmxzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0VBRUEsSUFBQSxHQUE2RCxPQUE3RCxDQUFxRSxZQUFBLENBQXJFLEVBQUUsVUFBeUQsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBRSxVQUFGLEVBQWdCLEdBQTJDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWdCLEdBQWhCLEVBQXFCLEtBQXNDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQXFCLEtBQXJCLEVBQTRCLElBQStCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTRCLElBQTVCLEVBQWtDLE1BQXlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWtDLE1BQWxDLEVBQTBDLEtBQWlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTBDLEtBQTFDLEVBQWlELE9BQVUsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBaUQ7RUFFakQsQ0FBRSxDQUFBLENBQUEsQ0FBRSxRQUFRLFNBQUE7RUFDWixHQUFJLENBQUEsQ0FBQSxDQUFFLFFBQVEsS0FBQTtFQUVkLFFBQVMsQ0FBQSxDQUFBLENBQUUsUUFBUSxjQUFBO0VBQ25CLGVBQWdCLENBQUEsQ0FBQSxDQUFFLFFBQVEsa0JBQUE7RUFFMUIsQ0FBRSxDQUFBLENBQUEsQ0FBRSxRQUFRLFlBQUE7RUFHWixNQUFPLENBQUEsQ0FBQSxDQUFFLFFBQVEsUUFBQTtFQUdqQixFQUFHLENBQUEsQ0FBQSxDQUFFLFFBQVEsSUFBQTtFQUNiLElBQUssQ0FBQSxDQUFBLENBQUUsUUFBUSxNQUFBO0VBRWYsVUFBVyxDQUFBLENBQUEsQ0FBRSxRQUFBLENBQUEsRUFBQTtJQUFHLElBQVMsQ0FBTixFQUFNLFFBQUEsQ0FBTixFQUFBLEVBQUcsQ0FBQSxXQUFHLENBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQSxHQUFBLENBQUcsS0FBWjtNQUF1QixNQUFNLEVBQU47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QUFBLENBQUcsQ0FBQSxDQUFBLENBQUMsR0FBQSxDQUFBLENBQUEsQ0FBRyxXQUFILENBQWUsS0FBQTs7T0FWbEM7TUFESjtNQURIOztJQWVGLEtBQUssUUFBQSxDQUFBLFFBQUE7O01BQ0gsTUFBTyxDQUFBLENBQUEsQ0FBRSxPQUFPLENBQUMsT0FBTTtNQUN2QixJQUFLLENBQUEsQ0FBQSxDQUFFLElBQUMsQ0FBQSxVQUFVLFFBQVEsQ0FBQyxJQUFUO2FBQ2xCLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFnRSxDQUF2RCxPQUFPLENBQUMsR0FBRyxDQUFBLENBQUEsQ0FBQyxHQUFBLENBQUEsQ0FBQSxDQUFDLENBQUUsTUFBTSxDQUFDLENBQUQsQ0FBSyxDQUFBLENBQUEsQ0FBRSxJQUFDLENBQUEsU0FBUyxDQUFBLENBQUEsQ0FBQSxDQUFDLEdBQUEsQ0FBQSxDQUFBLENBQUcsTUFBTSxDQUFDLENBQUQsQ0FBcEQsQ0FBMkQsQ0FBQSxDQUFBLENBQU8sS0FBQyxDQUFBLENBQUEsQ0FBRSxJQUFJLENBQUMsSUFBUCxDQUFZLElBQUQsQ0FBTyxDQUFBLENBQUEsQ0FBTSxJQUFDLENBQUEsQ0FBQSxDQUFFLENBQUMsUUFBUSxDQUFDLEdBQUksQ0FBQSxFQUFBLENBQU0sR0FBQSxDQUE5SDs7RUFyQmQsQ0FEbUQiLCJzb3VyY2VzQ29udGVudCI6WyIjYXV0b2NvbXBpbGVcblxueyBvYmotdG8tcGFpcnMsIG1hcCwgZm9sZDEsIGtleXMsIHZhbHVlcywgZmlyc3QsIGZsYXR0ZW4gfSA9IHJlcXVpcmUgJ3ByZWx1ZGUtbHMnXG5cbmggPSByZXF1aXJlICdoZWxwZXJzJ1xubmV0ID0gcmVxdWlyZSAnbmV0J1xuXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lNDAwMCdcbnN1YnNjcmlwdGlvbk1hbiA9IHJlcXVpcmUgJ3N1YnNjcmlwdGlvbm1hbjInXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuXG4jIGNvbnNvbGUgbG9nZ2VyXG5jb2xvcnMgPSByZXF1aXJlICdjb2xvcnMnXG5cbiMgdWRwIGxvZ2dlclxub3MgPSByZXF1aXJlICdvcydcbnV0aWwgPSByZXF1aXJlICd1dGlsJ1xuXG50aHJvd0Vycm9yID0gLT4gaWYgaXQ/QEAgaXMgRXJyb3IgdGhlbiB0aHJvdyBpdCBlbHNlIGl0XG5pZ25vcmVFcnJvciA9IC0+IGlmIGl0P0BAIGlzIEVycm9yIHRoZW4gdm9pZCBlbHNlIGl0XG5cbmNhbGxhYmxlID0gKGNscykgLT5cbiAgY2FsbGFibGVfY2xzID0gKC4uLmFyZ3MpIC0+XG4gICAgb2JqID0gKC4uLmFyZ3MpIC0+IG9iai5jYWxsLmFwcGx5IG9iaiwgYXJnc1xuICAgIG9iai5fX3Byb3RvX18gPSBjbHM6OlxuICAgIGNscy5hcHBseSBvYmosIGFyZ3NcbiAgICBvYmpcblxucGFyc2VUYWdzID0gLT5cbiAgXG4gIHJldCA9IHN3aXRjaCB4ID0gaXQ/QEBcbiAgICB8IHVuZGVmaW5lZCAgPT4ge31cbiAgICB8IFN0cmluZyAgICAgPT4geyBcIiN7aXR9XCI6IHRydWUgfVxuICAgIHwgTnVtYmVyICAgICA9PiB7IFwiI3tpdH1cIjogdHJ1ZSB9XG4gICAgfCBPYmplY3QgICAgID0+IGl0LnRhZ3M/IG9yIGl0XG4gICAgfCBBcnJheSAgICAgPT4gXy5yZWR1Y2UgaXQsICgodGFncywgZW50cnkpIC0+IHRhZ3MgPDw8IHBhcnNlVGFncyBlbnRyeSksIHt9XG4gICAgfCBvdGhlcndpc2UgID0+IHRocm93IEVycm9yIFwidGFncyB0eXBlIGludmFsaWQsIHJlY2VpdmVkOiAje2l0fVwiXG4gICAgXG4gIHJldFxuICAgICAgICBcblxuTG9nZ2VyID0gZXhwb3J0cy5Mb2dnZXIgPSBzdWJzY3JpcHRpb25NYW4uYmFzaWMuZXh0ZW5kNDAwMChcbiAgY2FsbDogKC4uLmFyZ3MpIC0+IEBsb2cuYXBwbHkgQCwgYXJnc1xuICAgIFxuICBpbml0aWFsaXplOiAoc2V0dGluZ3M9e30pIC0+XG4gICAgQGNvbnRleHQgPSAoQGVuc3VyZUNvbnRleHQgPj4gaWdub3JlRXJyb3IpKHNldHRpbmdzLmNvbnRleHQgb3Ige30pIG9yIHsgdGFnczoge30sIGRhdGE6IHt9IH1cbiAgICBAZGVwdGggPSBzZXR0aW5ncy5kZXB0aCBvciAwXG4gICAgQHBhcmVudCA9IHNldHRpbmdzLnBhcmVudFxuXG4gICAgQG91dHB1dHMgPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG5cbiAgICBpZiBzZXR0aW5ncy5vdXRwdXRzXG4gICAgICBcbiAgICAgIF8ubWFwIHNldHRpbmdzLm91dHB1dHMsIChzZXR0aW5ncyxuYW1lKSB+PlxuICAgICAgICBpZiBzZXR0aW5ncyB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IGV4cG9ydHNbbmFtZV0oc2V0dGluZ3MpXG4gICAgZWxzZSBpZiBAZGVwdGggaXMgMCB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IENvbnNvbGUoKVxuXG4gICAgQHN1YnNjcmliZSB0cnVlLCAoZXZlbnQpIH4+XG4gICAgICAgIEBvdXRwdXRzLmVhY2ggKG91dHB1dCkgLT4gb3V0cHV0LmxvZyBldmVudFxuICAgICAgICBpZiBAcGFyZW50IHRoZW4gQHBhcmVudC5sb2cgZXZlbnRcbiAgICBcbiAgYWRkVGFnczogKHRhZ3MpIC0+XG4gICAgdGFncyA9IHBhcnNlVGFncyB0YWdzXG4gICAgQGNvbnRleHQudGFncyA9IGguZXh0ZW5kIChAY29udGV4dC50YWdzIG9yIHt9KSwgdGFnc1xuXG4gIGRlbFRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3MgPSBwYXJzZVRhZ3MgdGFnc1xuICAgIEBjb250ZXh0LnRhZ3MgPSBoLmRpY3RNYXAgQGNvbnRleHQudGFncywgKHZhbCxuYW1lKSAtPlxuICAgICAgaWYgdGFnc1tuYW1lXSB0aGVuIHVuZGVmaW5lZCBlbHNlIHRydWVcblxuICBleHRlbmRDb250ZXh0OiAoLi4uY29udGV4dHMpIC0+XG4gICAgQGNvbnRleHQgPSBoLmV4dGVuZCBAY29udGV4dCwgQHBhcnNlQ29udGV4dHMgY29udGV4dHNcblxuICBjaGlsZDogKC4uLmNvbnRleHRzKSAtPlxuICAgIG5ldyBMb2dnZXIgZGVwdGg6IEBkZXB0aCArIDEsIHBhcmVudDogQCwgY29udGV4dDogQHBhcnNlQ29udGV4dHMgY29udGV4dHNcblxuICBlbnN1cmVDb250ZXh0OiAtPlxuICAgICMgZG9lcyB0aGlzIG9iamVjdCBoYXZlIGEgbG9nQ29udGV4dCBmdW5jdGlvbiBvciB2YWx1ZT9cbiAgICBjaGVja0NvbnRleHRGdW4gPSAtPlxuICAgICAgc3dpdGNoIHggPSBpdC5sb2dDb250ZXh0P0BAICMgd2l0aG91dCBlcXVhbGl0eSBoZXJlLCB0aGlzIGZhaWxzLCB3dGZcbiAgICAgIHwgdW5kZWZpbmVkICA9PiBpdFxuICAgICAgfCBPYmplY3QgICAgID0+IGl0LmxvZ0NvbnRleHRcbiAgICAgIHwgRnVuY3Rpb24gICA9PiBpdC5sb2dDb250ZXh0KClcbiAgICAgIHwgb3RoZXJ3aXNlICA9PiBFcnJvciBcImxvZ0NvbnRleHQgdHlwZSBtaXNtYXRjaFwiXG5cbiAgICBwYXNzRXJyID0gKGlucHV0LCBmKSAtPlxuICAgICAgaWYgaW5wdXQ/QEAgaXMgRXJyb3IgdGhlbiBFcnJvciBlbHNlIGYoaW5wdXQpXG5cbiAgICAjIGRpZCBJIGdldCBhbiBhcnJheT8gaWYgc28sIGJ1aWxkIGNvbnRleHQgb2JqZWN0XG4gICAgY2hlY2tDb250ZXh0QXJyYXkgPSAtPlxuICAgICAgaWYgaXQ/QEAgaXMgQXJyYXkgdGhlbiBwYXJzZUFycmF5IGl0IGVsc2UgaXRcblxuICAgICMgYnkgdGhpcyBwb2ludCBJIHNob3VsZCBiZSBkZWFsaW5nIHdpdGggYW4gb2JqZWN0LCBpZiBub3QsIHdlIGdvdCBnYXJiYWdlIGFzIGlucHV0XG4gICAgZW5zdXJlVHlwZSA9IC0+XG4gICAgICBpZiBpdD9AQCBpc250IE9iamVjdCB0aGVuIHRocm93IEVycm9yIFwiY291bGRuJ3QgY2FzdCB0byBsb2dDb250ZXh0ICgje2l0fSlcIlxuICAgICAgZWxzZSBpdFxuXG4gICAgIyBjaGVjayBpZiBteSBjb250ZXh0IG9iaiBpcyB2YWxpZFxuICAgIGNoZWNrQ29udGV4dE9iaiA9IC0+XG4gICAgICBpZiBub3QgaXQudGFncyBhbmQgbm90IGl0LmRhdGFcbiAgICAgICAgdGhyb3cgRXJyb3IgXCJ0aGlzIGlzIG5vdCBhIHZhbGlkIGxvZ0NvbnRleHQgb2JqZWN0ICcje3V0aWwuaW5zcGVjdChpdCl9J1wiXG5cbiAgICAgIHJldHVybiBpdHt0YWdzLCBkYXRhIG9yIHt9LCBtc2d9XG5cbiAgICAjIG1ha2Ugc3VyZSB0YWdzIGFyZSBhbiBvYmplY3QgYW5kIG5vdCBhbiBhcnJheSBvciB3aGF0ZXZlclxuICAgIGVuc3VyZVRhZ3MgPSB+PlxuICAgICAgZGF0YTogaXQuZGF0YVxuICAgICAgbXNnOiBpdC5tc2dcbiAgICAgIHRhZ3M6IHBhcnNlVGFncyBpdC50YWdzXG5cbiAgICBjaGVja1Jlc3QgPSAtPlxuICAgICAgaWYgaXQuZGF0YT8gYW5kIGl0LmRhdGFAQCBpc250IE9iamVjdFxuICAgICAgICB0aHJvdyBFcnJvciBcImRhdGEgY29uc3RydWN0b3IgaXNuJ3Qgb2JqZWN0ICgje2l0LmRhdGF9KVwiXG5cbiAgICAgIGlmIGl0Lm1zZz8gYW5kIGl0Lm1zZ0BAIGlzbnQgU3RyaW5nXG4gICAgICAgIHRocm93IEVycm9yIFwibXNnIGNvbnN0cnVjdG9yIGlzbid0IHN0cmluZyAoI3tpdC5tc2d9KVwiXG4gICAgICBpdFxuXG4gICAgdHJ5XG4gICAgICBpdFxuICAgICAgfD4gY2hlY2tDb250ZXh0RnVuID4+IGNoZWNrQ29udGV4dEFycmF5ID4+IGVuc3VyZVR5cGVcbiAgICAgIHw+IGNoZWNrQ29udGV4dE9iaiA+PiBlbnN1cmVUYWdzID4+IGNoZWNrUmVzdFxuXG4gICAgY2F0Y2ggZXJyXG4gICAgICBlcnJcblxuICBwYXJzZUNvbnRleHRzOiAoY29udGV4dHMpIC0+XG4gICAgY29udGV4dHNcbiAgICB8PiBtYXAgQGVuc3VyZUNvbnRleHQgPj4gdGhyb3dFcnJvclxuICAgIHw+IGZvbGQxIGguZXh0ZW5kXG5cbiAgbG9nOiAoLi4uY29udGV4dHMpIC0+XG4gICAgaWYgZmlyc3QoY29udGV4dHMpP0BAIGlzIFN0cmluZyB0aGVuIGNvbnRleHRzID0gWyBjb250ZXh0cyBdXG5cbiAgICBjb250ZXh0c1xuICAgIHw+IH4+IGlmIEBjb250ZXh0IHRoZW4gaC51bnNoaWZ0IGl0LCBAY29udGV4dCBlbHNlIGl0XG4gICAgfD4gQHBhcnNlQ29udGV4dHNcbiAgICB8PiBAZXZlbnRcbiAgICB8PiAoY29udGV4dCkgfj4gfj4gQGNoaWxkIF8ub21pdCBjb250ZXh0LCAnZGF0YScsICdtc2cnXG4pXG5cblxucGFyc2VBcnJheSA9IGV4cG9ydHMucGFyc2VBcnJheSA9IChbbXNnLCBkYXRhLCAuLi50YWdzXSkgLT5cbiAgc3dpdGNoIHggPSBtc2dAQFxuICB8IFN0cmluZyAgPT4geyBtc2c6IG1zZywgZGF0YTogZGF0YSwgdGFnczogdGFncyB9XG4gIHwgT2JqZWN0ICA9PiB7IGRhdGE6IG1zZywgdGFnczogZGF0YSB9XG4gIFxuXG5Db25zb2xlID0gZXhwb3J0cy5Db25zb2xlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMChcbiAgbmFtZTogJ2NvbnNvbGUnXG4gIGluaXRpYWxpemU6IC0+IEBzdGFydFRpbWUgPSBwcm9jZXNzLmhydGltZSgpWzBdXG4gIHBhcnNlVGFnczogKHRhZ3MpIC0+XG4gICAgdGFnc1xuICAgIHw+IG9iai10by1wYWlyc1xuICAgIHw+IG1hcCAoW3RhZywgdmFsdWVdKSAtPlxuXG4gICAgICBwYWludFN0cmluZyA9IC0+IFxuICAgICAgICBpZiBpdCBpbiA8WyBmYWlsIGVycm9yIGVyciB3YXJuaW5nIHdhcm4gXT4gdGhlbiByZXR1cm4gY29sb3JzLnJlZCBpdFxuICAgICAgICBpZiBpdCBpbiA8WyBkb25lIHBhc3Mgb2sgc3VjY2VzcyBjb21wbGV0ZWQgXT4gdGhlbiByZXR1cm4gY29sb3JzLmdyZWVuIGl0XG4gICAgICAgIGlmIGl0IGluIDxbIGV4ZWMgdGFzayBdPiB0aGVuIHJldHVybiBjb2xvcnMubWFnZW50YSBpdFxuICAgICAgICBpZiBpdCBpbiA8WyBHRVQgUE9TVCBsb2dpbiBpbiBvdXQgc2tpcF0+IHRoZW4gcmV0dXJuIGNvbG9ycy5tYWdlbnRhIGl0XG4gICAgICAgIHJldHVybiBjb2xvcnMueWVsbG93IGl0XG5cbiAgICAgIGlmIHZhbHVlIGlzIHRydWUgdGhlbiBwYWludFN0cmluZyB0YWdcbiAgICAgIGVsc2UgXCIje2NvbG9ycy5ncmF5IHRhZ306I3twYWludFN0cmluZyB2YWx1ZX1cIlxuXG5cbiAgbG9nOiAobG9nRXZlbnQpIC0+XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWUoKVxuICAgIHRhZ3MgPSBAcGFyc2VUYWdzIGxvZ0V2ZW50LnRhZ3NcbiAgICBjb25zb2xlLmxvZyBjb2xvcnMuZ3JlZW4oXCIje3Byb2Nlc3MucGlkfSAje2hydGltZVswXSAgLSBAc3RhcnRUaW1lfS4je2hydGltZVsxXX1cIikgKyBcIlxcdCBcIiArIHRhZ3Muam9pbignLCAnKSArIFwiXFx0XCIgKyAobG9nRXZlbnQubXNnIG9yIFwiLVwiKVxuKVxuIl19
