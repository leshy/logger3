# just experiments

class1 = (settings) ->
  @bla = 1
  @x = 3
  { bla: 555}
  
obj = new class1

console.log obj


class2 = ->
  @bla = 666
  
class2::f = -> 3
class2::call = -> @bla



callable = (cls) ->
  callable_cls = (...args) ->
    obj = (...args) -> obj.call.apply obj, args
    obj.__proto__ = cls::
    cls.apply obj, args
    obj

class3 = callable class2

obj2 = new class3()

console.log obj2()
console.log obj2.f()


