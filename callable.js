// Generated by LiveScript 1.3.1
(function(){
  var class1, obj, class2, callable, class3, obj2, slice$ = [].slice;
  class1 = function(settings){
    this.bla = 1;
    this.x = 3;
    return {
      bla: 555
    };
  };
  obj = new class1;
  console.log(obj);
  class2 = function(){
    return this.bla = 666;
  };
  class2.prototype.f = function(){
    return 3;
  };
  class2.prototype.call = function(){
    return this.bla;
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
  class3 = callable(class2);
  obj2 = new class3();
  console.log(obj2());
  console.log(obj2.f());
}).call(this);