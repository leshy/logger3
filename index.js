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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xlc2gvY29kaW5nL3Jlc2JvdS9jb3JlL25vZGVfbW9kdWxlcy9sb2dnZXIzL2luZGV4LmxzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0VBRUEsSUFBQSxHQUE2RCxPQUE3RCxDQUFxRSxZQUFBLENBQXJFLEVBQUUsVUFBeUQsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBRSxVQUFGLEVBQWdCLEdBQTJDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWdCLEdBQWhCLEVBQXFCLEtBQXNDLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQXFCLEtBQXJCLEVBQTRCLElBQStCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTRCLElBQTVCLEVBQWtDLE1BQXlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQWtDLE1BQWxDLEVBQTBDLEtBQWlCLENBQUEsQ0FBQSxDQUEzRCxJQUFBLENBQTBDLEtBQTFDLEVBQWlELE9BQVUsQ0FBQSxDQUFBLENBQTNELElBQUEsQ0FBaUQ7RUFHL0MsSUFBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQTtFQUNBLEVBQUEsQ0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUE7RUFDQSxPQUFBLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBO0VBQ0EsQ0FBQSxHQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBWSxJQUFaLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBWSxJQUFaLEVBQWtCLFlBQWxCLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBa0IsWUFBbEIsRUFBZ0MsTUFBaEMsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFnQztFQUdsQyxDQUFFLENBQUEsQ0FBQSxDQUFFLFFBQVEsU0FBQTtFQUNaLEdBQUksQ0FBQSxDQUFBLENBQUUsUUFBUSxLQUFBO0VBRWQsUUFBUyxDQUFBLENBQUEsQ0FBRSxRQUFRLGNBQUE7RUFDbkIsZUFBZ0IsQ0FBQSxDQUFBLENBQUUsUUFBUSxrQkFBQTtFQUkxQixNQUFPLENBQUEsQ0FBQSxD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QyxDQUFBLE1BQU0sQ0FBQyxDQUFDLEtBQUssU0FBUyxRQUFRLEtBQWpCLENBQVA7OztNQUR2QixJQUFDLENBQUE7TUFERCxJQUFDLENBQUE7TUFERCxRQUFBLENBQUEsRUFBQTtRQUFHLElBQUcsS0FBQyxDQUFBLE9BQUo7aUJBQWlCLENBQUMsQ0FBQyxRQUFRLElBQUksS0FBQyxDQUFBLE9BQUw7U0FBYTtpQkFBSzs7O01BRG5EOztFQXZHRixDQUR3RDtFQStHMUQsVUFBVyxDQUFBLENBQUEsQ0FBRSxPQUFPLENBQUMsVUFBVyxDQUFBLENBQUEsQ0FBRSxRQUFBLENBQUEsSUFBQTs7SUFBRSxlQUFLLGdCQUFTO0lBQ2hELFFBQU8sQ0FBRSxDQUFBLENBQUEsQ0FBRSxHQUFHLENBQUEsV0FBZDtBQUFBLElBQ0UsS0FBQSxNQUFBO0FBQUEsYUFBVztRQUFFLEtBQUs7UUFBSyxNQUFNO1FBQU0sTUFBTTtNQUE5QjtJQUNYLEtBQUEsTUFBQTtBQUFBLGFBQVc7UUFBRSxNQUFNO1FBQUssTUFBTTtNQUFuQiIsInNvdXJjZXNDb250ZW50IjpbIiNhdXRvY29tcGlsZVxuXG57IG9iai10by1wYWlycywgbWFwLCBmb2xkMSwga2V5cywgdmFsdWVzLCBmaXJzdCwgZmxhdHRlbiB9ID0gcmVxdWlyZSAncHJlbHVkZS1scydcblxucmVxdWlyZSEge1xuICB1dGlsXG4gIG9zXG4gIHByb2Nlc3NcbiAgbGVzaGRhc2g6IHsgZmluZCwgZGVmYXVsdHNEZWVwLCByZWR1Y2UgfTogX1xufVxuXG5oID0gcmVxdWlyZSAnaGVscGVycydcbm5ldCA9IHJlcXVpcmUgJ25ldCdcblxuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZTQwMDAnXG5zdWJzY3JpcHRpb25NYW4gPSByZXF1aXJlICdzdWJzY3JpcHRpb25tYW4yJ1xuXG5cbiMgY29uc29sZSBsb2dnZXJcbmNvbG9ycyA9IHJlcXVpcmUgJ2NvbG9ycydcblxudGhyb3dFcnJvciA9IC0+IGlmIGl0P0BAIGlzIEVycm9yIHRoZW4gdGhyb3cgaXQgZWxzZSBpdFxuaWdub3JlRXJyb3IgPSAtPiBpZiBpdD9AQCBpcyBFcnJvciB0aGVuIHZvaWQgZWxzZSBpdFxuXG5jYWxsYWJsZSA9IChjbHMpIC0+XG4gIGNhbGxhYmxlX2NscyA9ICguLi5hcmdzKSAtPlxuICAgIG9iaiA9ICguLi5hcmdzKSAtPiBvYmouY2FsbC5hcHBseSBvYmosIGFyZ3NcbiAgICBvYmouX19wcm90b19fID0gY2xzOjpcbiAgICBjbHMuYXBwbHkgb2JqLCBhcmdzXG4gICAgb2JqXG5cbnBhcnNlVGFncyA9IC0+XG4gIHJldCA9IHN3aXRjaCB4ID0gaXQ/QEBcbiAgICB8IHVuZGVmaW5lZCAgPT4ge31cbiAgICB8IFN0cmluZyAgICAgPT4geyBcIiN7aXR9XCI6IHRydWUgfVxuICAgIHwgTnVtYmVyICAgICA9PiB7IFwiI3tpdH1cIjogdHJ1ZSB9XG4gICAgfCBPYmplY3QgICAgID0+IGl0LnRhZ3M/IG9yIGl0XG4gICAgfCBBcnJheSAgICAgPT4gcmVkdWNlIGl0LCAoKHRhZ3MsIGVudHJ5KSAtPiB0YWdzIDw8PCBwYXJzZVRhZ3MgZW50cnkpLCB7fVxuICAgIHwgb3RoZXJ3aXNlICA9PiB0aHJvdyBFcnJvciBcInRhZ3MgdHlwZSBpbnZhbGlkLCByZWNlaXZlZDogI3tpdH1cIlxuICAgIFxuICByZXRcbiAgICAgICAgXG5Mb2dnZXIgPSBleHBvcnRzLkxvZ2dlciA9IHN1YnNjcmlwdGlvbk1hbi5iYXNpYy5leHRlbmQ0MDAwKFxuICBjYWxsOiAoLi4uYXJncykgLT4gQGxvZy5hcHBseSBALCBhcmdzXG4gIFxuICBkZWZhdWx0Q29udGV4dDogKGFkZENvbnRleHQ9e30pIC0+XG4gICAgZGVmYXVsdHNEZWVwIHt0YWdzOiB7IHBpZDogcHJvY2Vzcy5waWQsIGJveDogb3MuaG9zdG5hbWUhIH19LCBhZGRDb250ZXh0XG4gICAgXG4gIGluaXRpYWxpemU6IChzZXR0aW5ncz17fSkgLT5cbiAgICBcbiAgICBpZiBub3QgaW5pdENvbnRleHQgPSBzZXR0aW5ncy5jb250ZXh0IHRoZW4gaW5pdENvbnRleHQgPSBAZGVmYXVsdENvbnRleHQoc2V0dGluZ3MuYWRkQ29udGV4dClcbiAgICAgIFxuICAgIEBjb250ZXh0ID0gKEBlbnN1cmVDb250ZXh0ID4+IGlnbm9yZUVycm9yKShpbml0Q29udGV4dClcbiAgICBAZGVwdGggPSBzZXR0aW5ncy5kZXB0aCBvciAwXG4gICAgQHBhcmVudCA9IHNldHRpbmdzLnBhcmVudFxuICAgIEBpZ25vcmUgPSBzZXR0aW5ncy5pZ25vcmVcblxuICAgIEBvdXRwdXRzID0gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKVxuXG4gICAgaWYgc2V0dGluZ3Mub3V0cHV0c1xuICAgICAgXy5tYXAgc2V0dGluZ3Mub3V0cHV0cywgKHNldHRpbmdzLCBuYW1lKSB+PlxuICAgICAgICBpZiBzZXR0aW5ncyB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IGV4cG9ydHNbbmFtZV0oc2V0dGluZ3MpXG4gICAgZWxzZSBpZiBAZGVwdGggaXMgMCB0aGVuIEBvdXRwdXRzLnB1c2ggbmV3IGV4cG9ydHMuQ29uc29sZSgpXG5cblxuICAgIEBzdWJzY3JpYmUgdHJ1ZSwgKGV2ZW50KSB+PlxuICAgICAgICBAb3V0cHV0cy5lYWNoIChvdXRwdXQpIC0+IG91dHB1dC5sb2cgZXZlbnRcbiAgICAgICAgaWYgQHBhcmVudCB0aGVuIEBwYXJlbnQubG9nIGV2ZW50XG4gICAgXG4gIGFkZFRhZ3M6ICh0YWdzKSAtPlxuICAgIHRhZ3MgPSBwYXJzZVRhZ3MgdGFnc1xuICAgIEBjb250ZXh0LnRhZ3MgPSAoQGNvbnRleHQudGFncyBvciB7fSkgPDw8IHRhZ3NcblxuICBkZWxUYWdzOiAodGFncykgLT5cbiAgICB0YWdzID0gcGFyc2VUYWdzIHRhZ3NcbiAgICBAY29udGV4dC50YWdzID0gaC5kaWN0TWFwIEBjb250ZXh0LnRhZ3MsICh2YWwsbmFtZSkgLT5cbiAgICAgIGlmIHRhZ3NbbmFtZV0gdGhlbiB1bmRlZmluZWQgZWxzZSB0cnVlXG5cbiAgZXh0ZW5kQ29udGV4dDogKC4uLmNvbnRleHRzKSAtPlxuICAgIEBjb250ZXh0IDw8PCBAcGFyc2VDb250ZXh0cyBjb250ZXh0c1xuXG4gIGNoaWxkOiAoLi4uY29udGV4dHMpIC0+XG4gICAgbmV3IExvZ2dlciBkZXB0aDogQGRlcHRoICsgMSwgcGFyZW50OiBALCBjb250ZXh0OiBAcGFyc2VDb250ZXh0cyBjb250ZXh0cywgaWdub3JlOiBAaWdub3JlXG5cbiAgZW5zdXJlQ29udGV4dDogLT5cbiAgICAjIGRvZXMgdGhpcyBvYmplY3QgaGF2ZSBhIGxvZ0NvbnRleHQgZnVuY3Rpb24gb3IgdmFsdWU/XG4gICAgY2hlY2tDb250ZXh0RnVuID0gLT5cbiAgICAgIHN3aXRjaCB4ID0gaXQubG9nQ29udGV4dD9AQCAjIHdpdGhvdXQgZXF1YWxpdHkgaGVyZSwgdGhpcyBmYWlscywgd3RmXG4gICAgICB8IHVuZGVmaW5lZCAgPT4gaXRcbiAgICAgIHwgT2JqZWN0ICAgICA9PiBpdC5sb2dDb250ZXh0XG4gICAgICB8IEZ1bmN0aW9uICAgPT4gaXQubG9nQ29udGV4dCgpXG4gICAgICB8IG90aGVyd2lzZSAgPT4gRXJyb3IgXCJsb2dDb250ZXh0IHR5cGUgbWlzbWF0Y2hcIlxuXG4gICAgcGFzc0VyciA9IChpbnB1dCwgZikgLT5cbiAgICAgIGlmIGlucHV0P0BAIGlzIEVycm9yIHRoZW4gRXJyb3IgZWxzZSBmKGlucHV0KVxuXG5cbiAgICAjIGRpZCBJIGdldCBhbiBhcnJheT8gaWYgc28sIGJ1aWxkIGNvbnRleHQgb2JqZWN0XG4gICAgY2hlY2tDb250ZXh0QXJyYXkgPSAtPlxuICAgICAgaWYgaXQ/QEAgaXMgQXJyYXkgdGhlbiBwYXJzZUFycmF5IGl0IGVsc2UgaXRcblxuICAgICMgYnkgdGhpcyBwb2ludCBJIHNob3VsZCBiZSBkZWFsaW5nIHdpdGggYW4gb2JqZWN0LCBpZiBub3QsIHdlIGdvdCBnYXJiYWdlIGFzIGlucHV0XG4gICAgZW5zdXJlVHlwZSA9IC0+XG4gICAgICBpZiBpdD9AQCBpc250IE9iamVjdCB0aGVuIHRocm93IEVycm9yIFwiY291bGRuJ3QgY2FzdCB0byBsb2dDb250ZXh0ICgje2l0fSlcIlxuICAgICAgZWxzZSBpdFxuXG4gICAgIyBjaGVjayBpZiBteSBjb250ZXh0IG9iaiBpcyB2YWxpZFxuICAgIGNoZWNrQ29udGV4dE9iaiA9IC0+XG4gICAgICBpZiBub3QgaXQudGFncyBhbmQgbm90IGl0LmRhdGFcbiAgICAgICAgdGhyb3cgRXJyb3IgXCJ0aGlzIGlzIG5vdCBhIHZhbGlkIGxvZ0NvbnRleHQgb2JqZWN0ICcje3V0aWwuaW5zcGVjdChpdCl9J1wiXG5cbiAgICAgIHJldHVybiBpdHt0YWdzLCBkYXRhIG9yIHt9LCBtc2d9XG5cbiAgICAjIG1ha2Ugc3VyZSB0YWdzIGFyZSBhbiBvYmplY3QgYW5kIG5vdCBhbiBhcnJheSBvciB3aGF0ZXZlclxuICAgIGVuc3VyZVRhZ3MgPSB+PlxuICAgICAgZGF0YTogaXQuZGF0YVxuICAgICAgbXNnOiBpdC5tc2dcbiAgICAgIHRhZ3M6IHBhcnNlVGFncyBpdC50YWdzXG5cbiAgICBjaGVja1Jlc3QgPSAtPlxuICAgICAgaWYgaXQuZGF0YT8gYW5kIGl0LmRhdGFAQCBpc250IE9iamVjdFxuICAgICAgICB0aHJvdyBFcnJvciBcImRhdGEgY29uc3RydWN0b3IgaXNuJ3Qgb2JqZWN0ICgje2l0LmRhdGF9KVwiXG5cbiAgICAgIGlmIGl0Lm1zZz8gYW5kIGl0Lm1zZ0BAIGlzbnQgU3RyaW5nXG4gICAgICAgIHRocm93IEVycm9yIFwibXNnIGNvbnN0cnVjdG9yIGlzbid0IHN0cmluZyAoI3tpdC5tc2d9KVwiXG4gICAgICBpdFxuXG4gICAgdHJ5XG4gICAgICBpdFxuICAgICAgfD4gY2hlY2tDb250ZXh0RnVuID4+IGNoZWNrQ29udGV4dEFycmF5ID4+IGVuc3VyZVR5cGVcbiAgICAgIHw+IGNoZWNrQ29udGV4dE9iaiA+PiBlbnN1cmVUYWdzID4+IGNoZWNrUmVzdFxuXG4gICAgY2F0Y2ggZXJyXG4gICAgICBlcnJcblxuICBwYXJzZUNvbnRleHRzOiAoY29udGV4dHMpIC0+XG4gICAgY29udGV4dHNcbiAgICB8PiBtYXAgQGVuc3VyZUNvbnRleHQgPj4gdGhyb3dFcnJvclxuICAgIHw+IGZvbGQxIGguZXh0ZW5kXG5cbiAgbWF5YmVFdmVudDogKGxvZ0V2ZW50KSAtPlxuICAgIGlmIEBpZ25vcmUgYW5kIChmaW5kIChrZXlzIGxvZ0V2ZW50LnRhZ3MpLCB+PiBAaWdub3JlWyBpdCBdKSB0aGVuIHJldHVyblxuICAgIEBldmVudCBsb2dFdmVudFxuICBcbiAgbG9nOiAoLi4uY29udGV4dHMpIC0+XG4gICAgaWYgZmlyc3QoY29udGV4dHMpP0BAIGlzIFN0cmluZyB0aGVuIGNvbnRleHRzID0gWyBjb250ZXh0cyBdXG4gICAgY29udGV4dHNcbiAgICB8PiB+PiBpZiBAY29udGV4dCB0aGVuIGgudW5zaGlmdCBpdCwgQGNvbnRleHQgZWxzZSBpdFxuICAgIHw+IEBwYXJzZUNvbnRleHRzXG4gICAgfD4gQG1heWJlRXZlbnRcbiAgICB8PiAoY29udGV4dCkgfj4gfj4gQGNoaWxkIF8ub21pdCBjb250ZXh0LCAnZGF0YScsICdtc2cnXG4pXG5cbnBhcnNlQXJyYXkgPSBleHBvcnRzLnBhcnNlQXJyYXkgPSAoW21zZywgZGF0YSwgLi4udGFnc10pIC0+XG4gIHN3aXRjaCB4ID0gbXNnQEBcbiAgfCBTdHJpbmcgID0+IHsgbXNnOiBtc2csIGRhdGE6IGRhdGEsIHRhZ3M6IHRhZ3MgfVxuICB8IE9iamVjdCAgPT4geyBkYXRhOiBtc2csIHRhZ3M6IGRhdGEgfVxuICBcbiJdfQ==
