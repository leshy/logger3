(function(){
  var ref$, objToPairs, map, fold1, keys, values, first, flatten, util, os, process, _, find, defaultsDeep, reduce, h, net, Backbone, subscriptionMan, colors, throwError, ignoreError, callable, parseTags, Logger, parseArray, slice$ = [].slice;
  ref$ = require('prelude-ls'), objToPairs = ref$.objToPairs, map = ref$.map, fold1 = ref$.fold1, keys = ref$.keys, values = ref$.values, first = ref$.first, flatten = ref$.flatten;
  util = require('util');
  os = require('os');
  process = require('process');
  _ = require('leshdash'), find = _.find, defaultsDeep = _.defaultsDeep, reduce = _.reduce;
  h = require('helpers');
  net = require('net');
  Backbone = require('backbone4000');
  subscriptionMan = require('subscriptionman2');
  colors = require('colors');
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
        return reduce(it, function(tags, entry){
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
    defaultContext: function(addContext){
      addContext == null && (addContext = {});
      return defaultsDeep({
        tags: {
          pid: process.pid,
          box: os.hostname()
        }
      }, addContext);
    },
    initialize: function(settings){
      var initContext, this$ = this;
      settings == null && (settings = {});
      if (!(initContext = settings.context)) {
        initContext = this.defaultContext(settings.addContext);
      }
      this.context = compose$(this.ensureContext, ignoreError)(initContext);
      this.depth = settings.depth || 0;
      this.parent = settings.parent;
      this.ignore = settings.ignore;
      this.outputs = new Backbone.Collection();
      if (settings.outputs) {
        _.map(settings.outputs, function(settings, name){
          if (settings) {
            return this$.outputs.push(new exports[name](settings));
          }
        });
      } else if (this.depth === 0) {
        this.outputs.push(new exports.Console());
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
      return this.context.tags = import$(this.context.tags || {}, tags);
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
      return import$(this.context, this.parseContexts(contexts));
    },
    child: function(){
      var contexts;
      contexts = slice$.call(arguments);
      return new Logger({
        depth: this.depth + 1,
        parent: this,
        context: this.parseContexts(contexts, {
          ignore: this.ignore
        })
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
    maybeEvent: function(logEvent){
      var this$ = this;
      if (this.ignore && find(keys(logEvent.tags), function(it){
        return this$.ignore[it];
      })) {
        return;
      }
      logEvent.time = new Date().getTime();
      return this.event(logEvent);
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
      this.maybeEvent(
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL3Jlc2JvdS9zZXJ2ZXJzaWRlL25vZGVfbW9kdWxlcy9sb2dnZXIzL2luZGV4LmxzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0VBRUEsSUFBQSxHQUE2RCxPQUE3RCxDQUFxRSxZQUFBLENBQXJFLEVBQUUsVUFBeUQsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBRSxVQUFGLEVBQWdCLEdBQTJDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWdCLEdBQWhCLEVBQXFCLEtBQXNDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQXFCLEtBQXJCLEVBQTRCLElBQStCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTRCLElBQTVCLEVBQWtDLE1BQXlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWtDLE1BQWxDLEVBQTBDLEtBQWlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTBDLEtBQTFDLEVBQWlELE9BQVUsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBaUQ7RUFHL0MsSUFBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQTtFQUNBLEVBQUEsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUE7RUFDQSxPQUFBLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBO0VBQ0EsQ0FBQSxHQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBWSxJQUFaLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBWSxJQUFaLEVBQWtCLFlBQWxCLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBa0IsWUFBbEIsRUFBZ0MsTUFBaEMsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFnQztFQUdsQyxDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsU0FBQTtFQUNaLEdBQUksQ0FBQSxDQUFBLENBQUUsUUFBUSxLQUFBO0VBRWQsUUFBUyxDQUFBLENBQUEsQ0FBRSxRQUFRLGNBQUE7RUFDbkIsZUFBZ0IsQ0FBQSxDQUFBLENBQUUsUUFBUSxrQkFBQTtFQUkxQixNQUFPLENBQUEs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LENBQUUsQ0FBRSxRQUFGOzthQUs3QyxRQUFBLENBQUEsT0FBQTtlQUFhLFFBQUEsQ0FBQTtpQkFBRyxLQUFDLENBQUEsTUFBTSxDQUFDLENBQUMsS0FBSyxTQUFTLFFBQVEsS0FBakIsQ0FBUDs7O01BRHZCLElBQUMsQ0FBQTtNQURELElBQUMsQ0FBQTtNQURELFFBQUEsQ0FBQSxFQUFBO1FBQUcsSUFBRyxLQUFDLENBQUEsT0FBSjtpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsSUFBSSxLQUFDLENBQUEsT0FBTDtTQUFhO2lCQUFLOzs7TUFEbkQ7O0VBeEdGLENBRHdEO0VBZ0gxRCxVQUFXLENBQUEsQ0FBQSxDQUFFLE9BQU8sQ0FBQyxVQUFXLENBQUEsQ0FBQSxDQUFFLFFBQUEsQ0FBQSxJQUFBOztJQUFFLGVBQUssZ0JBQVM7SUFDaEQsUUFBTyxDQUFFLENBQUEsQ0FBQSxDQUFFLEdBQUcsQ0FBQSxXQUFkO0FBQUEsSUFDRSxLQUFBLE1BQUE7QUFBQSxhQUFXO1FBQUUsS0FBSztRQUFLLE1BQU07UUFBTSxNQUFNO01BQTlCO0lBQ1gsS0FBQSxNQUFBO0FBQUEsYUFBVztRQUFFLE1BQU07UUFBSyxNQUFNO01BQW5CIiwic291cmNlc0NvbnRlbnQiOlsiI2F1dG9jb21waWxlXG5cbnsgb2JqLXRvLXBhaXJzLCBtYXAsIGZvbGQxLCBrZXlzLCB2YWx1ZXMsIGZpcnN0LCBmbGF0dGVuIH0gPSByZXF1aXJlICdwcmVsdWRlLWxzJ1xuXG5yZXF1aXJlISB7XG4gIHV0aWxcbiAgb3NcbiAgcHJvY2Vzc1xuICBsZXNoZGFzaDogeyBmaW5kLCBkZWZhdWx0c0RlZXAsIHJlZHVjZSB9OiBfXG59XG5cbmggPSByZXF1aXJlICdoZWxwZXJzJ1xubmV0ID0gcmVxdWlyZSAnbmV0J1xuXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lNDAwMCdcbnN1YnNjcmlwdGlvbk1hbiA9IHJlcXVpcmUgJ3N1YnNjcmlwdGlvbm1hbjInXG5cblxuIyBjb25zb2xlIGxvZ2dlclxuY29sb3JzID0gcmVxdWlyZSAnY29sb3JzJ1xuXG50aHJvd0Vycm9yID0gLT4gaWYgaXQ/QEAgaXMgRXJyb3IgdGhlbiB0aHJvdyBpdCBlbHNlIGl0XG5pZ25vcmVFcnJvciA9IC0+IGlmIGl0P0BAIGlzIEVycm9yIHRoZW4gdm9pZCBlbHNlIGl0XG5cbmNhbGxhYmxlID0gKGNscykgLT5cbiAgY2FsbGFibGVfY2xzID0gKC4uLmFyZ3MpIC0+XG4gICAgb2JqID0gKC4uLmFyZ3MpIC0+IG9iai5jYWxsLmFwcGx5IG9iaiwgYXJnc1xuICAgIG9iai5fX3Byb3RvX18gPSBjbHM6OlxuICAgIGNscy5hcHBseSBvYmosIGFyZ3NcbiAgICBvYmpcblxucGFyc2VUYWdzID0gLT5cbiAgcmV0ID0gc3dpdGNoIHggPSBpdD9AQFxuICAgIHwgdW5kZWZpbmVkICA9PiB7fVxuICAgIHwgU3RyaW5nICAgICA9PiB7IFwiI3tpdH1cIjogdHJ1ZSB9XG4gICAgfCBOdW1iZXIgICAgID0+IHsgXCIje2l0fVwiOiB0cnVlIH1cbiAgICB8IE9iamVjdCAgICAgPT4gaXQudGFncz8gb3IgaXRcbiAgICB8IEFycmF5ICAgICA9PiByZWR1Y2UgaXQsICgodGFncywgZW50cnkpIC0+IHRhZ3MgPDw8IHBhcnNlVGFncyBlbnRyeSksIHt9XG4gICAgfCBvdGhlcndpc2UgID0+IHRocm93IEVycm9yIFwidGFncyB0eXBlIGludmFsaWQsIHJlY2VpdmVkOiAje2l0fVwiXG4gICAgXG4gIHJldFxuICAgICAgICBcbkxvZ2dlciA9IGV4cG9ydHMuTG9nZ2VyID0gc3Vic2NyaXB0aW9uTWFuLmJhc2ljLmV4dGVuZDQwMDAoXG4gIGNhbGw6ICguLi5hcmdzKSAtPiBAbG9nLmFwcGx5IEAsIGFyZ3NcbiAgXG4gIGRlZmF1bHRDb250ZXh0OiAoYWRkQ29udGV4dD17fSkgLT5cbiAgICBkZWZhdWx0c0RlZXAge3RhZ3M6IHsgcGlkOiBwcm9jZXNzLnBpZCwgYm94OiBvcy5ob3N0bmFtZSEgfX0sIGFkZENvbnRleHRcbiAgICBcbiAgaW5pdGlhbGl6ZTogKHNldHRpbmdzPXt9KSAtPlxuICAgIFxuICAgIGlmIG5vdCBpbml0Q29udGV4dCA9IHNldHRpbmdzLmNvbnRleHQgdGhlbiBpbml0Q29udGV4dCA9IEBkZWZhdWx0Q29udGV4dChzZXR0aW5ncy5hZGRDb250ZXh0KVxuICAgICAgXG4gICAgQGNvbnRleHQgPSAoQGVuc3VyZUNvbnRleHQgPj4gaWdub3JlRXJyb3IpKGluaXRDb250ZXh0KVxuICAgIEBkZXB0aCA9IHNldHRpbmdzLmRlcHRoIG9yIDBcbiAgICBAcGFyZW50ID0gc2V0dGluZ3MucGFyZW50XG4gICAgQGlnbm9yZSA9IHNldHRpbmdzLmlnbm9yZVxuXG4gICAgQG91dHB1dHMgPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG5cbiAgICBpZiBzZXR0aW5ncy5vdXRwdXRzXG4gICAgICBfLm1hcCBzZXR0aW5ncy5vdXRwdXRzLCAoc2V0dGluZ3MsIG5hbWUpIH4+XG4gICAgICAgIGlmIHNldHRpbmdzIHRoZW4gQG91dHB1dHMucHVzaCBuZXcgZXhwb3J0c1tuYW1lXShzZXR0aW5ncylcbiAgICBlbHNlIGlmIEBkZXB0aCBpcyAwIHRoZW4gQG91dHB1dHMucHVzaCBuZXcgZXhwb3J0cy5Db25zb2xlKClcblxuXG4gICAgQHN1YnNjcmliZSB0cnVlLCAoZXZlbnQpIH4+XG4gICAgICAgIEBvdXRwdXRzLmVhY2ggKG91dHB1dCkgLT4gb3V0cHV0LmxvZyBldmVudFxuICAgICAgICBpZiBAcGFyZW50IHRoZW4gQHBhcmVudC5sb2cgZXZlbnRcbiAgICBcbiAgYWRkVGFnczogKHRhZ3MpIC0+XG4gICAgdGFncyA9IHBhcnNlVGFncyB0YWdzXG4gICAgQGNvbnRleHQudGFncyA9IChAY29udGV4dC50YWdzIG9yIHt9KSA8PDwgdGFnc1xuXG4gIGRlbFRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3MgPSBwYXJzZVRhZ3MgdGFnc1xuICAgIEBjb250ZXh0LnRhZ3MgPSBoLmRpY3RNYXAgQGNvbnRleHQudGFncywgKHZhbCxuYW1lKSAtPlxuICAgICAgaWYgdGFnc1tuYW1lXSB0aGVuIHVuZGVmaW5lZCBlbHNlIHRydWVcblxuICBleHRlbmRDb250ZXh0OiAoLi4uY29udGV4dHMpIC0+XG4gICAgQGNvbnRleHQgPDw8IEBwYXJzZUNvbnRleHRzIGNvbnRleHRzXG5cbiAgY2hpbGQ6ICguLi5jb250ZXh0cykgLT5cbiAgICBuZXcgTG9nZ2VyIGRlcHRoOiBAZGVwdGggKyAxLCBwYXJlbnQ6IEAsIGNvbnRleHQ6IEBwYXJzZUNvbnRleHRzIGNvbnRleHRzLCBpZ25vcmU6IEBpZ25vcmVcblxuICBlbnN1cmVDb250ZXh0OiAtPlxuICAgICMgZG9lcyB0aGlzIG9iamVjdCBoYXZlIGEgbG9nQ29udGV4dCBmdW5jdGlvbiBvciB2YWx1ZT9cbiAgICBjaGVja0NvbnRleHRGdW4gPSAtPlxuICAgICAgc3dpdGNoIHggPSBpdC5sb2dDb250ZXh0P0BAICMgd2l0aG91dCBlcXVhbGl0eSBoZXJlLCB0aGlzIGZhaWxzLCB3dGZcbiAgICAgIHwgdW5kZWZpbmVkICA9PiBpdFxuICAgICAgfCBPYmplY3QgICAgID0+IGl0LmxvZ0NvbnRleHRcbiAgICAgIHwgRnVuY3Rpb24gICA9PiBpdC5sb2dDb250ZXh0KClcbiAgICAgIHwgb3RoZXJ3aXNlICA9PiBFcnJvciBcImxvZ0NvbnRleHQgdHlwZSBtaXNtYXRjaFwiXG5cbiAgICBwYXNzRXJyID0gKGlucHV0LCBmKSAtPlxuICAgICAgaWYgaW5wdXQ/QEAgaXMgRXJyb3IgdGhlbiBFcnJvciBlbHNlIGYoaW5wdXQpXG5cblxuICAgICMgZGlkIEkgZ2V0IGFuIGFycmF5PyBpZiBzbywgYnVpbGQgY29udGV4dCBvYmplY3RcbiAgICBjaGVja0NvbnRleHRBcnJheSA9IC0+XG4gICAgICBpZiBpdD9AQCBpcyBBcnJheSB0aGVuIHBhcnNlQXJyYXkgaXQgZWxzZSBpdFxuXG4gICAgIyBieSB0aGlzIHBvaW50IEkgc2hvdWxkIGJlIGRlYWxpbmcgd2l0aCBhbiBvYmplY3QsIGlmIG5vdCwgd2UgZ290IGdhcmJhZ2UgYXMgaW5wdXRcbiAgICBlbnN1cmVUeXBlID0gLT5cbiAgICAgIGlmIGl0P0BAIGlzbnQgT2JqZWN0IHRoZW4gdGhyb3cgRXJyb3IgXCJjb3VsZG4ndCBjYXN0IHRvIGxvZ0NvbnRleHQgKCN7aXR9KVwiXG4gICAgICBlbHNlIGl0XG5cbiAgICAjIGNoZWNrIGlmIG15IGNvbnRleHQgb2JqIGlzIHZhbGlkXG4gICAgY2hlY2tDb250ZXh0T2JqID0gLT5cbiAgICAgIGlmIG5vdCBpdC50YWdzIGFuZCBub3QgaXQuZGF0YVxuICAgICAgICB0aHJvdyBFcnJvciBcInRoaXMgaXMgbm90IGEgdmFsaWQgbG9nQ29udGV4dCBvYmplY3QgJyN7dXRpbC5pbnNwZWN0KGl0KX0nXCJcblxuICAgICAgcmV0dXJuIGl0e3RhZ3MsIGRhdGEgb3Ige30sIG1zZ31cblxuICAgICMgbWFrZSBzdXJlIHRhZ3MgYXJlIGFuIG9iamVjdCBhbmQgbm90IGFuIGFycmF5IG9yIHdoYXRldmVyXG4gICAgZW5zdXJlVGFncyA9IH4+XG4gICAgICBkYXRhOiBpdC5kYXRhXG4gICAgICBtc2c6IGl0Lm1zZ1xuICAgICAgdGFnczogcGFyc2VUYWdzIGl0LnRhZ3NcblxuICAgIGNoZWNrUmVzdCA9IC0+XG4gICAgICBpZiBpdC5kYXRhPyBhbmQgaXQuZGF0YUBAIGlzbnQgT2JqZWN0XG4gICAgICAgIHRocm93IEVycm9yIFwiZGF0YSBjb25zdHJ1Y3RvciBpc24ndCBvYmplY3QgKCN7aXQuZGF0YX0pXCJcblxuICAgICAgaWYgaXQubXNnPyBhbmQgaXQubXNnQEAgaXNudCBTdHJpbmdcbiAgICAgICAgdGhyb3cgRXJyb3IgXCJtc2cgY29uc3RydWN0b3IgaXNuJ3Qgc3RyaW5nICgje2l0Lm1zZ30pXCJcbiAgICAgIGl0XG5cbiAgICB0cnlcbiAgICAgIGl0XG4gICAgICB8PiBjaGVja0NvbnRleHRGdW4gPj4gY2hlY2tDb250ZXh0QXJyYXkgPj4gZW5zdXJlVHlwZVxuICAgICAgfD4gY2hlY2tDb250ZXh0T2JqID4+IGVuc3VyZVRhZ3MgPj4gY2hlY2tSZXN0XG5cbiAgICBjYXRjaCBlcnJcbiAgICAgIGVyclxuXG4gIHBhcnNlQ29udGV4dHM6IChjb250ZXh0cykgLT5cbiAgICBjb250ZXh0c1xuICAgIHw+IG1hcCBAZW5zdXJlQ29udGV4dCA+PiB0aHJvd0Vycm9yXG4gICAgfD4gZm9sZDEgaC5leHRlbmRcblxuICBtYXliZUV2ZW50OiAobG9nRXZlbnQpIC0+XG4gICAgaWYgQGlnbm9yZSBhbmQgKGZpbmQgKGtleXMgbG9nRXZlbnQudGFncyksIH4+IEBpZ25vcmVbIGl0IF0pIHRoZW4gcmV0dXJuXG4gICAgbG9nRXZlbnQudGltZSA9IG5ldyBEYXRlIWdldFRpbWUhXG4gICAgQGV2ZW50IGxvZ0V2ZW50XG4gIFxuICBsb2c6ICguLi5jb250ZXh0cykgLT5cbiAgICBpZiBmaXJzdChjb250ZXh0cyk/QEAgaXMgU3RyaW5nIHRoZW4gY29udGV4dHMgPSBbIGNvbnRleHRzIF1cbiAgICBjb250ZXh0c1xuICAgIHw+IH4+IGlmIEBjb250ZXh0IHRoZW4gaC51bnNoaWZ0IGl0LCBAY29udGV4dCBlbHNlIGl0XG4gICAgfD4gQHBhcnNlQ29udGV4dHNcbiAgICB8PiBAbWF5YmVFdmVudFxuICAgIHw+IChjb250ZXh0KSB+PiB+PiBAY2hpbGQgXy5vbWl0IGNvbnRleHQsICdkYXRhJywgJ21zZydcbilcblxucGFyc2VBcnJheSA9IGV4cG9ydHMucGFyc2VBcnJheSA9IChbbXNnLCBkYXRhLCAuLi50YWdzXSkgLT5cbiAgc3dpdGNoIHggPSBtc2dAQFxuICB8IFN0cmluZyAgPT4geyBtc2c6IG1zZywgZGF0YTogZGF0YSwgdGFnczogdGFncyB9XG4gIHwgT2JqZWN0ICA9PiB7IGRhdGE6IG1zZywgdGFnczogZGF0YSB9XG4gIFxuIl19
