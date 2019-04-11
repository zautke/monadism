import {Eq, Extend, Nil, Monad, eq, exists} from './Functional'

/***
 * The primary ways to create new Maybe instances.
 */

/* tslint:disable no-use-before-declare */

export const Just = <A>(value: A) => Maybe.Just<A>(value)

export const Nothing = <A>() => Maybe.Nothing<A>()

export const maybe = <A>(value: A | Nil) => Maybe.fromNullable<A>(value)

/* tslint:enable no-use-before-declare */

/**
 * A class to represent an optional value with a convenient chaining syntax and strong type safety.
 */
export default class Maybe<A> implements Monad<A>, Eq<Maybe<A>>, Extend<A> {
  private option: [A?]

  /**
   * This is not intended to be used directly. Use `Just`, `Nothing`, or `maybe` exported at the
   * top of the file.
   */
  private constructor (value?: A | Nil) {
    this.option = exists(value) ? [value!] : []
  }

  /**
   * These are exported as top-level values at the top of the file for convenience.
   */
  static Just = <A>(value: A) => new Maybe<A>(value)

  static Nothing = <A>() => new Maybe<A>()

  static fromNullable = <A>(value: A | Nil) => new Maybe<A>(value)

  /**
   * Use of this function should be discouraged. Use one of the stronger methods below in most
   * cases.
   */
  toNullable = () => this.option[0]

  /**
   * Return `true` or `false` depending on whether there is Just something or Nothing.
   */
  toBoolean = () => Boolean(this.toNullable())

  /**
   * If the value of the current Maybe is Nothing, return a default value instaed.
   */
  getOr = (def: A) => this.toNullable() || def

  /**
   * If the value of the current Maybe is Nothing, throw the given error message.
   * WARNING: Unsafe - could throw an exception.
   */
  getOrThrowMessage = (message: string) => {
    const val = this.toNullable()

    if (exists(val)) {
      return val as A
    }

    throw new Error(message)
  }

  /**
   * If the value of the current Maybe is Nothing, throw a default error message.
   * WARNING: Unsafe - could throw an exception.
   */
  getOrThrow = () => this.getOrThrowMessage('Maybe was Nothing')

  /**
   * Our name for `flatMap`. Allows sequencing of Maybe values and functions that return a Maybe.
   * The distinction in many functional languages is that `andThen` runs side effects where
   * `flatMap` is pure. In TypeScript we use `then` as convenient naming for either `flatMap` or
   * `andThen` because we have no idea whether you're running side effects in your callback function
   * or not.
   */
  then = <B>(func: (a: A) => Maybe<B>): Maybe<B> => {
    const val = this.toNullable()

    if (exists(val)) {
      return func(val!)
    }

    return Nothing()
  }

  /**
   * Allos sequencing of Maybe values and functions that accept a Maybe and return a non-Maybe
   * value.
   */
  extend = <B>(func: (a: Maybe<A>) => B): Maybe<B> => maybe(func(this))

  /**
   * Run a side effect if the value is Just something.
   */
  on = (callback: (a: A) => void) => this.map(val => {
    callback(val)

    return val
  })

  /**
   * Run a side effect if the value is Nothing.
   */
  unless = (callback: () => void): Maybe<A> => {
    const val = this.toNullable()

    if (!exists(val)) {
      callback()
    }

    return this
  }

  /**
   * Take a function that maps one type to another and lift it to work with Maybes.
   */
  map = <B>(func: (a: A) => B): Maybe<B> => this.then(val => Just<B>(func(val)))

  /**
   * Similar to then, but it replaces the return value with what is provided if there is Just
   * something, discarding the original value.
   */
  when = <B>(b: B): Maybe<B> => this.map(_ => b)

  /**
   * Unpacks a Maybe for a function from A to B into a function from Maybe A to Maybe B. Allows
   * functions contained within a Just to transform a value contained within a Just.
   */
  apply = <B>(m: Maybe<(a: A) => B>): Maybe<B> => this.then(val => m.map(func => func(val)))

  /**
   * Returns a Maybe for the value at the given key. Currently, we will have a pass an explicit type
   * here to override the one that TypeScript infers. Hopefully this will get better over time.
   */
  prop = <B extends A[keyof A]>(key: keyof A): Maybe<B> => this.then(
    val => (val && key in val) ? Just(val[key] as B) : Nothing()
  )

  /**
   * If the value is Nothing, returns false. If the value is Just something, returns the Boolean
   * value of something.
   */
  equals = (m: Maybe<A>): boolean => {
    const a = this.toNullable()
    const b = m.toNullable()

    return !a ? !b : !b ? false : eq(a, b)
  }

  /**
   * The first Maybe that is Just something is returned, otherwise Nothing is returned.
   */
  alt = (m: Maybe<A>): Maybe<A> => {
    const a = this.toNullable()
    const b = m.toNullable()

    if (exists(a)) {
      return Just(a as A)
    }

    if (exists(b)) {
      return Just(b as A)
    }

    return Nothing()
  }

  /**
   * Apply a function to each case in the data structure.
   */
  fold = <B>(b: B, func: (a: A) => B): B => this.map(func).getOr(b)
}
