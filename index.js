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
    var x, tmp;
    switch (x = it != null ? it.constructor : void 8) {
    case undefined:
      return {};
    case String:
      tmp = {};
      tmp[it] = true;
      return tmp;
    case Number:
      tmp = {};
      tmp[String(it)] = true;
      return tmp;
    case Object:
      return it.tags != null || it;
    case Array:
      return compose$(flatten, h.arrayToDict)(it);
    default:
      throw Error("tags type invalid, received: " + it);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL25vZGVsaWJzL2xvZ2dlcjMvaW5kZXgubHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7RUFDQSxJQUFBLEdBQStDLE9BQS9DLENBQXVELFlBQUEsQ0FBdkQsRUFBRSxHQUEyQyxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFFLEdBQUYsRUFBTyxLQUFzQyxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFPLEtBQVAsRUFBYyxJQUErQixDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFjLElBQWQsRUFBb0IsTUFBeUIsQ0FBQSxDQUFBLENBQTdDLElBQUEsQ0FBb0IsTUFBcEIsRUFBNEIsS0FBaUIsQ0FBQSxDQUFBLENBQTdDLElBQUEsQ0FBNEIsS0FBNUIsRUFBbUMsT0FBVSxDQUFBLENBQUEsQ0FBN0MsSUFBQSxDQUFtQztFQUNuQyxDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsU0FBQTtFQUNaLEdBQUksQ0FBQSxDQUFBLENBQUUsUUFBUSxLQUFBO0VBRWQsUUFBUyxDQUFBLENBQUEsQ0FBRSxRQUFRLGNBQUE7RUFDbkIsZUFBZ0IsQ0FBQSxDQUFBLENBQUUsUUFBUSxrQkFBRDtFQUV6QixDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsWUFBQTtFQUVaLE1BQU8sQ0FBQSxDQUFBLENBQUUsUUFBUSxRQUFBO0VBR2pCLEVBQUcsQ0FBQSxDQUFBLENBQUUsUUFBUSxJQUFBO0VBQ2IsSUFBSyxDQUFBLENBQUEsQ0FBRSxRQUFRLE1BQUE7RUFFZixVQUFXLENBQUEsQ0FBQSxDQUFFLFFBQUEsQ0FBQSxFQUFBO0lBQUcsSUFBUyxDQUFOLEVBQU0sUUFBQSxDQUFOLEVBQUEsRUFBRyxDQUFBLFdBQUcsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBRyxLQUFaO01BQXVCLE1BQU0sRUFBTjtLQUFTO2FBQUs7OztFQUNyRCxXQUFZLENBQUEsQ0FBQSxDQUFFLFFBQUEsQ0FBQSxFQUFBO0lBQUcsSUFBUyxDQUFOLEVBQU0sUUFBQSxD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LENBQVksSUFBRCxDQUFPLENBQUEsQ0FBQSxDQUFNLElBQUMsQ0FBQSxDQUFBLENBQUUsQ0FBQyxRQUFRLENBQUMsR0FBSSxDQUFBLEVBQUEsQ0FBTSxHQUFBLENBQS9HOztFQWRkLENBRG1EIiwic291cmNlc0NvbnRlbnQiOlsiI2F1dG9jb21waWxlXG57IG1hcCwgZm9sZDEsIGtleXMsIHZhbHVlcywgZmlyc3QsIGZsYXR0ZW4gfSA9IHJlcXVpcmUgJ3ByZWx1ZGUtbHMnXG5oID0gcmVxdWlyZSAnaGVscGVycydcbm5ldCA9IHJlcXVpcmUgJ25ldCdcblxuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZTQwMDAnXG5zdWJzY3JpcHRpb25NYW4gPSByZXF1aXJlKCdzdWJzY3JpcHRpb25tYW4yJylcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG4jIGNvbnNvbGUgbG9nZ2VyXG5jb2xvcnMgPSByZXF1aXJlICdjb2xvcnMnXG5cbiMgdWRwIGxvZ2dlclxub3MgPSByZXF1aXJlICdvcydcbnV0aWwgPSByZXF1aXJlICd1dGlsJ1xuXG50aHJvd0Vycm9yID0gLT4gaWYgaXQ/QEAgaXMgRXJyb3IgdGhlbiB0aHJvdyBpdCBlbHNlIGl0XG5pZ25vcmVFcnJvciA9IC0+IGlmIGl0P0BAIGlzIEVycm9yIHRoZW4gdm9pZCBlbHNlIGl0XG5cbmNhbGxhYmxlID0gKGNscykgLT5cbiAgY2FsbGFibGVfY2xzID0gKC4uLmFyZ3MpIC0+XG4gICAgb2JqID0gKC4uLmFyZ3MpIC0+IG9iai5jYWxsLmFwcGx5IG9iaiwgYXJnc1xuICAgIG9iai5fX3Byb3RvX18gPSBjbHM6OlxuICAgIGNscy5hcHBseSBvYmosIGFyZ3NcbiAgICBvYmpcblxucGFyc2VUYWdzID0gLT5cbiAgc3dpdGNoIHggPSBpdD9AQFxuICAgIHwgdW5kZWZpbmVkICA9PiB7fVxuICAgIHwgU3RyaW5nICAgICA9PiB0bXAgPSB7IH07IHRtcFtpdF0gPSB0cnVlOyB0bXBcbiAgICB8IE51bWJlciAgICAgPT4gdG1wID0geyB9OyB0bXBbU3RyaW5nKGl0KV0gPSB0cnVlOyB0bXBcbiAgICB8IE9iamVjdCAgICAgPT4gaXQudGFncz8gb3IgaXRcbiAgICB8IEFycmF5ICAgICAgPT4gKGZsYXR0ZW4gPj4gaC5hcnJheVRvRGljdCkoaXQpXG4gICAgfCBvdGhlcndpc2UgID0+IHRocm93IEVycm9yIFwidGFncyB0eXBlIGludmFsaWQsIHJlY2VpdmVkOiAje2l0fVwiXG5cbkxvZ2dlciA9IGV4cG9ydHMuTG9nZ2VyID0gc3Vic2NyaXB0aW9uTWFuLmJhc2ljLmV4dGVuZDQwMDAoXG4gIGNhbGw6ICguLi5hcmdzKSAtPiBAbG9nLmFwcGx5IEAsIGFyZ3NcbiAgICBcbiAgaW5pdGlhbGl6ZTogKHNldHRpbmdzPXt9KSAtPlxuICAgIEBjb250ZXh0ID0gKEBlbnN1cmVDb250ZXh0ID4+IGlnbm9yZUVycm9yKShzZXR0aW5ncy5jb250ZXh0IG9yIHt9KSBvciB7IHRhZ3M6IHt9LCBkYXRhOiB7fSB9XG4gICAgQGRlcHRoID0gc2V0dGluZ3MuZGVwdGggb3IgMFxuICAgIEBwYXJlbnQgPSBzZXR0aW5ncy5wYXJlbnRcblxuICAgIEBvdXRwdXRzID0gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKVxuXG4gICAgaWYgc2V0dGluZ3Mub3V0cHV0c1xuICAgICAgXG4gICAgICBfLm1hcCBzZXR0aW5ncy5vdXRwdXRzLCAoc2V0dGluZ3MsbmFtZSkgfj5cbiAgICAgICAgaWYgc2V0dGluZ3MgdGhlbiBAb3V0cHV0cy5wdXNoIG5ldyBleHBvcnRzW25hbWVdKHNldHRpbmdzKVxuICAgIGVsc2UgaWYgQGRlcHRoIGlzIDAgdGhlbiBAb3V0cHV0cy5wdXNoIG5ldyBDb25zb2xlKClcblxuICAgIEBzdWJzY3JpYmUgdHJ1ZSwgKGV2ZW50KSB+PlxuICAgICAgICBAb3V0cHV0cy5lYWNoIChvdXRwdXQpIC0+IG91dHB1dC5sb2cgZXZlbnRcbiAgICAgICAgaWYgQHBhcmVudCB0aGVuIEBwYXJlbnQubG9nIGV2ZW50XG4gICAgXG4gIGFkZFRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3MgPSBwYXJzZVRhZ3MgdGFnc1xuICAgIEBjb250ZXh0LnRhZ3MgPSBoLmV4dGVuZCAoQGNvbnRleHQudGFncyBvciB7fSksIHRhZ3NcblxuICBkZWxUYWdzOiAodGFncykgLT5cbiAgICB0YWdzID0gcGFyc2VUYWdzIHRhZ3NcbiAgICBAY29udGV4dC50YWdzID0gaC5kaWN0TWFwIEBjb250ZXh0LnRhZ3MsICh2YWwsbmFtZSkgLT5cbiAgICAgIGlmIHRhZ3NbbmFtZV0gdGhlbiB1bmRlZmluZWQgZWxzZSB0cnVlXG5cbiAgZXh0ZW5kQ29udGV4dDogKC4uLmNvbnRleHRzKSAtPlxuICAgIEBjb250ZXh0ID0gaC5leHRlbmQgQGNvbnRleHQsIEBwYXJzZUNvbnRleHRzIGNvbnRleHRzXG5cbiAgY2hpbGQ6ICguLi5jb250ZXh0cykgLT5cbiAgICBuZXcgTG9nZ2VyIGRlcHRoOiBAZGVwdGggKyAxLCBwYXJlbnQ6IEAsIGNvbnRleHQ6IEBwYXJzZUNvbnRleHRzIGNvbnRleHRzXG5cbiAgZW5zdXJlQ29udGV4dDogLT5cbiAgICAjIGRvZXMgdGhpcyBvYmplY3QgaGF2ZSBhIGxvZ0NvbnRleHQgZnVuY3Rpb24gb3IgdmFsdWU/XG4gICAgY2hlY2tDb250ZXh0RnVuID0gLT5cbiAgICAgIHN3aXRjaCB4ID0gaXQubG9nQ29udGV4dD9AQCAjIHdpdGhvdXQgZXF1YWxpdHkgaGVyZSwgdGhpcyBmYWlscywgd3RmXG4gICAgICB8IHVuZGVmaW5lZCAgPT4gaXRcbiAgICAgIHwgT2JqZWN0ICAgICA9PiBpdC5sb2dDb250ZXh0XG4gICAgICB8IEZ1bmN0aW9uICAgPT4gaXQubG9nQ29udGV4dCgpXG4gICAgICB8IG90aGVyd2lzZSAgPT4gRXJyb3IgXCJsb2dDb250ZXh0IHR5cGUgbWlzbWF0Y2hcIlxuXG4gICAgcGFzc0VyciA9IChpbnB1dCwgZikgLT5cbiAgICAgIGlmIGlucHV0P0BAIGlzIEVycm9yIHRoZW4gRXJyb3IgZWxzZSBmKGlucHV0KVxuXG4gICAgIyBkaWQgSSBnZXQgYW4gYXJyYXk/IGlmIHNvLCBidWlsZCBjb250ZXh0IG9iamVjdFxuICAgIGNoZWNrQ29udGV4dEFycmF5ID0gLT5cbiAgICAgIGlmIGl0P0BAIGlzIEFycmF5IHRoZW4gcGFyc2VBcnJheSBpdCBlbHNlIGl0XG5cbiAgICAjIGJ5IHRoaXMgcG9pbnQgSSBzaG91bGQgYmUgZGVhbGluZyB3aXRoIGFuIG9iamVjdCwgaWYgbm90LCB3ZSBnb3QgZ2FyYmFnZSBhcyBpbnB1dFxuICAgIGVuc3VyZVR5cGUgPSAtPlxuICAgICAgaWYgaXQ/QEAgaXNudCBPYmplY3QgdGhlbiB0aHJvdyBFcnJvciBcImNvdWxkbid0IGNhc3QgdG8gbG9nQ29udGV4dCAoI3tpdH0pXCJcbiAgICAgIGVsc2UgaXRcblxuICAgICMgY2hlY2sgaWYgbXkgY29udGV4dCBvYmogaXMgdmFsaWRcbiAgICBjaGVja0NvbnRleHRPYmogPSAtPlxuICAgICAgaWYgbm90IGl0LnRhZ3MgYW5kIG5vdCBpdC5kYXRhXG4gICAgICAgIHRocm93IEVycm9yIFwidGhpcyBpcyBub3QgYSB2YWxpZCBsb2dDb250ZXh0IG9iamVjdCAnI3t1dGlsLmluc3BlY3QoaXQpfSdcIlxuXG4gICAgICByZXR1cm4gaXR7dGFncywgZGF0YSBvciB7fSwgbXNnfVxuXG4gICAgIyBtYWtlIHN1cmUgdGFncyBhcmUgYW4gb2JqZWN0IGFuZCBub3QgYW4gYXJyYXkgb3Igd2hhdGV2ZXJcbiAgICBlbnN1cmVUYWdzID0gfj5cbiAgICAgIGRhdGE6IGl0LmRhdGFcbiAgICAgIG1zZzogaXQubXNnXG4gICAgICB0YWdzOiBwYXJzZVRhZ3MgaXQudGFnc1xuXG4gICAgY2hlY2tSZXN0ID0gLT5cbiAgICAgIGlmIGl0LmRhdGE/IGFuZCBpdC5kYXRhQEAgaXNudCBPYmplY3RcbiAgICAgICAgdGhyb3cgRXJyb3IgXCJkYXRhIGNvbnN0cnVjdG9yIGlzbid0IG9iamVjdCAoI3tpdC5kYXRhfSlcIlxuXG4gICAgICBpZiBpdC5tc2c/IGFuZCBpdC5tc2dAQCBpc250IFN0cmluZ1xuICAgICAgICB0aHJvdyBFcnJvciBcIm1zZyBjb25zdHJ1Y3RvciBpc24ndCBzdHJpbmcgKCN7aXQubXNnfSlcIlxuICAgICAgaXRcblxuICAgIHRyeVxuICAgICAgaXRcbiAgICAgIHw+IGNoZWNrQ29udGV4dEZ1biA+PiBjaGVja0NvbnRleHRBcnJheSA+PiBlbnN1cmVUeXBlXG4gICAgICB8PiBjaGVja0NvbnRleHRPYmogPj4gZW5zdXJlVGFncyA+PiBjaGVja1Jlc3RcblxuICAgIGNhdGNoIGVyclxuICAgICAgZXJyXG5cbiAgcGFyc2VDb250ZXh0czogKGNvbnRleHRzKSAtPlxuICAgIGNvbnRleHRzXG4gICAgfD4gbWFwIEBlbnN1cmVDb250ZXh0ID4+IHRocm93RXJyb3JcbiAgICB8PiBmb2xkMSBoLmV4dGVuZFxuXG4gIGxvZzogKC4uLmNvbnRleHRzKSAtPlxuICAgIGlmIGZpcnN0KGNvbnRleHRzKT9AQCBpcyBTdHJpbmcgdGhlbiBjb250ZXh0cyA9IFsgY29udGV4dHMgXVxuXG4gICAgY29udGV4dHNcbiAgICB8PiB+PiBpZiBAY29udGV4dCB0aGVuIGgudW5zaGlmdCBpdCwgQGNvbnRleHQgZWxzZSBpdFxuICAgIHw+IEBwYXJzZUNvbnRleHRzXG4gICAgfD4gQGV2ZW50XG4gICAgfD4gKGNvbnRleHQpIH4+IH4+IEBjaGlsZCBfLm9taXQgY29udGV4dCwgJ2RhdGEnLCAnbXNnJ1xuKVxuXG5cbnBhcnNlQXJyYXkgPSBleHBvcnRzLnBhcnNlQXJyYXkgPSAoW21zZywgZGF0YSwgLi4udGFnc10pIC0+XG4gIHN3aXRjaCB4ID0gbXNnQEBcbiAgfCBTdHJpbmcgID0+IHsgbXNnOiBtc2csIGRhdGE6IGRhdGEsIHRhZ3M6IHRhZ3MgfVxuICB8IE9iamVjdCAgPT4geyBkYXRhOiBtc2csIHRhZ3M6IGRhdGEgfVxuICBcblxuQ29uc29sZSA9IGV4cG9ydHMuQ29uc29sZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDQwMDAoXG4gIG5hbWU6ICdjb25zb2xlJ1xuICBpbml0aWFsaXplOiAtPiBAc3RhcnRUaW1lID0gcHJvY2Vzcy5ocnRpbWUoKVswXVxuICBwYXJzZVRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3NcbiAgICB8PiBrZXlzXG4gICAgfD4gbWFwICh0YWcpIC0+XG4gICAgICBpZiB0YWcgaXMgJ2ZhaWwnIG9yIHRhZyBpcyAnZXJyb3InIHRoZW4gcmV0dXJuIGNvbG9ycy5yZWQgdGFnXG4gICAgICBpZiB0YWcgaW4gWyAncGFzcycsICdvaycsICdzdWNjZXNzJywgJ2NvbXBsZXRlZCcgXSB0aGVuIHJldHVybiBjb2xvcnMuZ3JlZW4gdGFnXG4gICAgICBpZiB0YWcgaW4gWyAnR0VUJywnUE9TVCcsICdsb2dpbicsICdpbicsICdvdXQnIF0gdGhlbiByZXR1cm4gY29sb3JzLm1hZ2VudGEgdGFnXG4gICAgICByZXR1cm4gY29sb3JzLnllbGxvdyB0YWdcblxuICBsb2c6IChsb2dFdmVudCkgLT5cbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZSgpXG4gICAgdGFncyA9IEBwYXJzZVRhZ3MgbG9nRXZlbnQudGFnc1xuICAgIGNvbnNvbGUubG9nIGNvbG9ycy5ncmVlbihcIiN7aHJ0aW1lWzBdICAtIEBzdGFydFRpbWV9LiN7aHJ0aW1lWzFdfVwiKSArIFwiXFx0IFwiICsgdGFncy5qb2luKCcsICcpICsgXCJcXHRcIiArIChsb2dFdmVudC5tc2cgb3IgXCItXCIpXG4pXG4iXX0=
