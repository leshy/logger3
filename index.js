(function(){
  var ref$, map, fold1, keys, values, first, flatten, h, net, Backbone, subscriptionMan, _, colors, os, util, throwError, ignoreError, callable, parseTags, Logger, parseArray, Console, slice$ = [].slice;
  ref$ = require('prelude-ls'), map = ref$.map, fold1 = ref$.fold1, keys = ref$.keys, values = ref$.values, first = ref$.first, flatten = ref$.flatten;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL25vZGVsaWJzL2xvZ2dlcjMvaW5kZXgubHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7RUFFQSxJQUFBLEdBQStDLE9BQS9DLENBQXVELFlBQUEsQ0FBdkQsRUFBRSxHQUEyQyxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFFLEdBQUYsRUFBTyxLQUFzQyxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFPLEtBQVAsRUFBYyxJQUErQixDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFjLElBQWQsRUFBb0IsTUFBeUIsQ0FBQSxDQUFBLENBQTdDLElBQUEsQ0FBb0IsTUFBcEIsRUFBNEIsS0FBaUIsQ0FBQSxDQUFBLENBQTdDLElBQUEsQ0FBNEIsS0FBNUIsRUFBbUMsT0FBVSxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFtQztFQUVuQyxDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsU0FBQTtFQUNaLEdBQUksQ0FBQSxDQUFBLENBQUUsUUFBUSxLQUFBO0VBRWQsUUFBUyxDQUFBLENBQUEsQ0FBRSxRQUFRLGNBQUE7RUFDbkIsZUFBZ0IsQ0FBQSxDQUFBLENBQUUsUUFBUSxrQkFBRDtFQUV6QixDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsWUFBQTtFQUVaLE1BQU8sQ0FBQSxDQUFBLENBQUUsUUFBUSxRQUFBO0VBR2pCLEVBQUcsQ0FBQSxDQUFBLENBQUUsUUFBUSxJQUFBO0VBQ2IsSUFBSyxDQUFBLENBQUEsQ0FBRSxRQUFRLE1BQUE7RUFFZixVQUFXLENBQUEsQ0FBQSxDQUFFLFFBQUEsQ0FBQSxFQUFBO0lBQUcsSUFBUyxDQUFOLEVBQU0sUUFBQSxDQUFOLEVBQUEsRUFBRyxDQUFBLFdBQUcsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBRyxLQUFaO01BQXVCLE1BQU0sRUFBTjtLQUFTO2FBQUs7OztFQUNyRCxXQUFZLENBQUEsQ0FBQSxDQUFFLFFBQUEsQ0FBQSxFQUFBO0lBQUcsSUFBUyxDQUFOLEVBQU0sUUFBQSxD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Q0FBQSxDQUFBLENBQU0sSUFBQyxDQUFBLENBQUEsQ0FBRSxDQUFDLFFBQVEsQ0FBQyxHQUFJLENBQUEsRUFBQSxDQUFNLEdBQUEsQ0FBL0c7O0VBZGQsQ0FEbUQiLCJzb3VyY2VzQ29udGVudCI6WyIjYXV0b2NvbXBpbGVcblxueyBtYXAsIGZvbGQxLCBrZXlzLCB2YWx1ZXMsIGZpcnN0LCBmbGF0dGVuIH0gPSByZXF1aXJlICdwcmVsdWRlLWxzJ1xuXG5oID0gcmVxdWlyZSAnaGVscGVycydcbm5ldCA9IHJlcXVpcmUgJ25ldCdcblxuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZTQwMDAnXG5zdWJzY3JpcHRpb25NYW4gPSByZXF1aXJlKCdzdWJzY3JpcHRpb25tYW4yJylcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG4jIGNvbnNvbGUgbG9nZ2VyXG5jb2xvcnMgPSByZXF1aXJlICdjb2xvcnMnXG5cbiMgdWRwIGxvZ2dlclxub3MgPSByZXF1aXJlICdvcydcbnV0aWwgPSByZXF1aXJlICd1dGlsJ1xuXG50aHJvd0Vycm9yID0gLT4gaWYgaXQ/QEAgaXMgRXJyb3IgdGhlbiB0aHJvdyBpdCBlbHNlIGl0XG5pZ25vcmVFcnJvciA9IC0+IGlmIGl0P0BAIGlzIEVycm9yIHRoZW4gdm9pZCBlbHNlIGl0XG5cbmNhbGxhYmxlID0gKGNscykgLT5cbiAgY2FsbGFibGVfY2xzID0gKC4uLmFyZ3MpIC0+XG4gICAgb2JqID0gKC4uLmFyZ3MpIC0+IG9iai5jYWxsLmFwcGx5IG9iaiwgYXJnc1xuICAgIG9iai5fX3Byb3RvX18gPSBjbHM6OlxuICAgIGNscy5hcHBseSBvYmosIGFyZ3NcbiAgICBvYmpcblxucGFyc2VUYWdzID0gLT5cbiAgXG4gIHJldCA9IHN3aXRjaCB4ID0gaXQ/QEBcbiAgICB8IHVuZGVmaW5lZCAgPT4ge31cbiAgICB8IFN0cmluZyAgICAgPT4geyBcIiN7aXR9XCI6IHRydWUgfVxuICAgIHwgTnVtYmVyICAgICA9PiB7IFwiI3tpdH1cIjogdHJ1ZSB9XG4gICAgfCBPYmplY3QgICAgID0+IGl0LnRhZ3M/IG9yIGl0XG4gICAgfCBBcnJheSAgICAgPT4gXy5yZWR1Y2UgaXQsICgodGFncywgZW50cnkpIC0+IHRhZ3MgPDw8IHBhcnNlVGFncyBlbnRyeSksIHt9XG4gICAgfCBvdGhlcndpc2UgID0+IHRocm93IEVycm9yIFwidGFncyB0eXBlIGludmFsaWQsIHJlY2VpdmVkOiAje2l0fVwiXG4gICAgXG4gIHJldFxuICAgICAgICBcblxuTG9nZ2VyID0gZXhwb3J0cy5Mb2dnZXIgPSBzdWJzY3JpcHRpb25NYW4uYmFzaWMuZXh0ZW5kNDAwMChcbiAgY2FsbDogKC4uLmFyZ3MpIC0+IEBsb2cuYXBwbHkgQCwgYXJnc1xuICAgIFxuICBpbml0aWFsaXplOiAoc2V0dGluZ3M9e30pIC0+XG4gICAgQGNvbnRleHQgPSAoQGVuc3VyZUNvbnRleHQgPj4gaWdub3JlRXJyb3IpKHNldHRpbmdzLmNvbnRleHQgb3Ige30pIG9yIHsgdGFnczoge30sIGRhdGE6IHt9IH1cbiAgICBAZGVwdGggPSBzZXR0aW5ncy5kZXB0aCBvciAwXG4gICAgQHBhcmVudCA9IHNldHRpbmdzLnBhcmVudFxuXG4gICAgQG91dHB1dHMgPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG5cbiAgICBpZiBzZXR0aW5ncy5vdXRwdXRzXG4gICAgICBcbiAgICAgIF8ubWFwIHNldHRpbmdzLm91dHB1dHMsIChzZXR0aW5ncyxuYW1lKSB+PlxuICAgICAgICBpZiBzZXR0aW5ncyB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IGV4cG9ydHNbbmFtZV0oc2V0dGluZ3MpXG4gICAgZWxzZSBpZiBAZGVwdGggaXMgMCB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IENvbnNvbGUoKVxuXG4gICAgQHN1YnNjcmliZSB0cnVlLCAoZXZlbnQpIH4+XG4gICAgICAgIEBvdXRwdXRzLmVhY2ggKG91dHB1dCkgLT4gb3V0cHV0LmxvZyBldmVudFxuICAgICAgICBpZiBAcGFyZW50IHRoZW4gQHBhcmVudC5sb2cgZXZlbnRcbiAgICBcbiAgYWRkVGFnczogKHRhZ3MpIC0+XG4gICAgdGFncyA9IHBhcnNlVGFncyB0YWdzXG4gICAgQGNvbnRleHQudGFncyA9IGguZXh0ZW5kIChAY29udGV4dC50YWdzIG9yIHt9KSwgdGFnc1xuXG4gIGRlbFRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3MgPSBwYXJzZVRhZ3MgdGFnc1xuICAgIEBjb250ZXh0LnRhZ3MgPSBoLmRpY3RNYXAgQGNvbnRleHQudGFncywgKHZhbCxuYW1lKSAtPlxuICAgICAgaWYgdGFnc1tuYW1lXSB0aGVuIHVuZGVmaW5lZCBlbHNlIHRydWVcblxuICBleHRlbmRDb250ZXh0OiAoLi4uY29udGV4dHMpIC0+XG4gICAgQGNvbnRleHQgPSBoLmV4dGVuZCBAY29udGV4dCwgQHBhcnNlQ29udGV4dHMgY29udGV4dHNcblxuICBjaGlsZDogKC4uLmNvbnRleHRzKSAtPlxuICAgIG5ldyBMb2dnZXIgZGVwdGg6IEBkZXB0aCArIDEsIHBhcmVudDogQCwgY29udGV4dDogQHBhcnNlQ29udGV4dHMgY29udGV4dHNcblxuICBlbnN1cmVDb250ZXh0OiAtPlxuICAgICMgZG9lcyB0aGlzIG9iamVjdCBoYXZlIGEgbG9nQ29udGV4dCBmdW5jdGlvbiBvciB2YWx1ZT9cbiAgICBjaGVja0NvbnRleHRGdW4gPSAtPlxuICAgICAgc3dpdGNoIHggPSBpdC5sb2dDb250ZXh0P0BAICMgd2l0aG91dCBlcXVhbGl0eSBoZXJlLCB0aGlzIGZhaWxzLCB3dGZcbiAgICAgIHwgdW5kZWZpbmVkICA9PiBpdFxuICAgICAgfCBPYmplY3QgICAgID0+IGl0LmxvZ0NvbnRleHRcbiAgICAgIHwgRnVuY3Rpb24gICA9PiBpdC5sb2dDb250ZXh0KClcbiAgICAgIHwgb3RoZXJ3aXNlICA9PiBFcnJvciBcImxvZ0NvbnRleHQgdHlwZSBtaXNtYXRjaFwiXG5cbiAgICBwYXNzRXJyID0gKGlucHV0LCBmKSAtPlxuICAgICAgaWYgaW5wdXQ/QEAgaXMgRXJyb3IgdGhlbiBFcnJvciBlbHNlIGYoaW5wdXQpXG5cbiAgICAjIGRpZCBJIGdldCBhbiBhcnJheT8gaWYgc28sIGJ1aWxkIGNvbnRleHQgb2JqZWN0XG4gICAgY2hlY2tDb250ZXh0QXJyYXkgPSAtPlxuICAgICAgaWYgaXQ/QEAgaXMgQXJyYXkgdGhlbiBwYXJzZUFycmF5IGl0IGVsc2UgaXRcblxuICAgICMgYnkgdGhpcyBwb2ludCBJIHNob3VsZCBiZSBkZWFsaW5nIHdpdGggYW4gb2JqZWN0LCBpZiBub3QsIHdlIGdvdCBnYXJiYWdlIGFzIGlucHV0XG4gICAgZW5zdXJlVHlwZSA9IC0+XG4gICAgICBpZiBpdD9AQCBpc250IE9iamVjdCB0aGVuIHRocm93IEVycm9yIFwiY291bGRuJ3QgY2FzdCB0byBsb2dDb250ZXh0ICgje2l0fSlcIlxuICAgICAgZWxzZSBpdFxuXG4gICAgIyBjaGVjayBpZiBteSBjb250ZXh0IG9iaiBpcyB2YWxpZFxuICAgIGNoZWNrQ29udGV4dE9iaiA9IC0+XG4gICAgICBpZiBub3QgaXQudGFncyBhbmQgbm90IGl0LmRhdGFcbiAgICAgICAgdGhyb3cgRXJyb3IgXCJ0aGlzIGlzIG5vdCBhIHZhbGlkIGxvZ0NvbnRleHQgb2JqZWN0ICcje3V0aWwuaW5zcGVjdChpdCl9J1wiXG5cbiAgICAgIHJldHVybiBpdHt0YWdzLCBkYXRhIG9yIHt9LCBtc2d9XG5cbiAgICAjIG1ha2Ugc3VyZSB0YWdzIGFyZSBhbiBvYmplY3QgYW5kIG5vdCBhbiBhcnJheSBvciB3aGF0ZXZlclxuICAgIGVuc3VyZVRhZ3MgPSB+PlxuICAgICAgZGF0YTogaXQuZGF0YVxuICAgICAgbXNnOiBpdC5tc2dcbiAgICAgIHRhZ3M6IHBhcnNlVGFncyBpdC50YWdzXG5cbiAgICBjaGVja1Jlc3QgPSAtPlxuICAgICAgaWYgaXQuZGF0YT8gYW5kIGl0LmRhdGFAQCBpc250IE9iamVjdFxuICAgICAgICB0aHJvdyBFcnJvciBcImRhdGEgY29uc3RydWN0b3IgaXNuJ3Qgb2JqZWN0ICgje2l0LmRhdGF9KVwiXG5cbiAgICAgIGlmIGl0Lm1zZz8gYW5kIGl0Lm1zZ0BAIGlzbnQgU3RyaW5nXG4gICAgICAgIHRocm93IEVycm9yIFwibXNnIGNvbnN0cnVjdG9yIGlzbid0IHN0cmluZyAoI3tpdC5tc2d9KVwiXG4gICAgICBpdFxuXG4gICAgdHJ5XG4gICAgICBpdFxuICAgICAgfD4gY2hlY2tDb250ZXh0RnVuID4+IGNoZWNrQ29udGV4dEFycmF5ID4+IGVuc3VyZVR5cGVcbiAgICAgIHw+IGNoZWNrQ29udGV4dE9iaiA+PiBlbnN1cmVUYWdzID4+IGNoZWNrUmVzdFxuXG4gICAgY2F0Y2ggZXJyXG4gICAgICBlcnJcblxuICBwYXJzZUNvbnRleHRzOiAoY29udGV4dHMpIC0+XG4gICAgY29udGV4dHNcbiAgICB8PiBtYXAgQGVuc3VyZUNvbnRleHQgPj4gdGhyb3dFcnJvclxuICAgIHw+IGZvbGQxIGguZXh0ZW5kXG5cbiAgbG9nOiAoLi4uY29udGV4dHMpIC0+XG4gICAgaWYgZmlyc3QoY29udGV4dHMpP0BAIGlzIFN0cmluZyB0aGVuIGNvbnRleHRzID0gWyBjb250ZXh0cyBdXG5cbiAgICBjb250ZXh0c1xuICAgIHw+IH4+IGlmIEBjb250ZXh0IHRoZW4gaC51bnNoaWZ0IGl0LCBAY29udGV4dCBlbHNlIGl0XG4gICAgfD4gQHBhcnNlQ29udGV4dHNcbiAgICB8PiBAZXZlbnRcbiAgICB8PiAoY29udGV4dCkgfj4gfj4gQGNoaWxkIF8ub21pdCBjb250ZXh0LCAnZGF0YScsICdtc2cnXG4pXG5cblxucGFyc2VBcnJheSA9IGV4cG9ydHMucGFyc2VBcnJheSA9IChbbXNnLCBkYXRhLCAuLi50YWdzXSkgLT5cbiAgc3dpdGNoIHggPSBtc2dAQFxuICB8IFN0cmluZyAgPT4geyBtc2c6IG1zZywgZGF0YTogZGF0YSwgdGFnczogdGFncyB9XG4gIHwgT2JqZWN0ICA9PiB7IGRhdGE6IG1zZywgdGFnczogZGF0YSB9XG4gIFxuXG5Db25zb2xlID0gZXhwb3J0cy5Db25zb2xlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kNDAwMChcbiAgbmFtZTogJ2NvbnNvbGUnXG4gIGluaXRpYWxpemU6IC0+IEBzdGFydFRpbWUgPSBwcm9jZXNzLmhydGltZSgpWzBdXG4gIHBhcnNlVGFnczogKHRhZ3MpIC0+XG4gICAgdGFnc1xuICAgIHw+IGtleXNcbiAgICB8PiBtYXAgKHRhZykgLT5cbiAgICAgIGlmIHRhZyBpcyAnZmFpbCcgb3IgdGFnIGlzICdlcnJvcicgdGhlbiByZXR1cm4gY29sb3JzLnJlZCB0YWdcbiAgICAgIGlmIHRhZyBpbiBbICdwYXNzJywgJ29rJywgJ3N1Y2Nlc3MnLCAnY29tcGxldGVkJyBdIHRoZW4gcmV0dXJuIGNvbG9ycy5ncmVlbiB0YWdcbiAgICAgIGlmIHRhZyBpbiBbICdHRVQnLCdQT1NUJywgJ2xvZ2luJywgJ2luJywgJ291dCcgXSB0aGVuIHJldHVybiBjb2xvcnMubWFnZW50YSB0YWdcbiAgICAgIHJldHVybiBjb2xvcnMueWVsbG93IHRhZ1xuXG4gIGxvZzogKGxvZ0V2ZW50KSAtPlxuICAgIGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lKClcbiAgICB0YWdzID0gQHBhcnNlVGFncyBsb2dFdmVudC50YWdzXG4gICAgY29uc29sZS5sb2cgY29sb3JzLmdyZWVuKFwiI3tocnRpbWVbMF0gIC0gQHN0YXJ0VGltZX0uI3tocnRpbWVbMV19XCIpICsgXCJcXHQgXCIgKyB0YWdzLmpvaW4oJywgJykgKyBcIlxcdFwiICsgKGxvZ0V2ZW50Lm1zZyBvciBcIi1cIilcbilcbiJdfQ==
