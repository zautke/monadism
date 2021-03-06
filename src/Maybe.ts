import {Eq, Extend, Nil, Monoid, Monad, empty, eq, exists} from './Functional'

/**
 * A Maybe represents an optional value (A) with a convenient chaining syntax and strong type
 * inference. To create one, use the top-level constructors [[Just]], or [[Nothing]].
 *
 * ```ts
 * import {Just, Maybe, Nothing, exists} from 'monadism'
 *
 * import Cache from '@my/app/Cache'
 *
 * const getUser = (userId: string): Maybe<string> => {
 *   const val = Cache.get(userId)
 *
 *   return exists(val) ? Just(val) : Nothing()
 * }
 * ```
 *
 * Or, use the [[maybe]] convenience function:
 *
 * ```ts
 * import {maybe} from 'monadism'
 *
 * import {User} from '@my/app/Types'
 *
 * const getUser = (userId: string): Maybe<User> => maybe(Cache.get(userId))
 * ```
 *
 * @typeparam A - The type of optional value the Maybe represents.
 */
export default class Maybe<A> implements Eq<Maybe<A>>, Monoid<A>, Monad<A>, Extend<A> {
  empty = empty<A>()

  /**
   * The internal value of the Maybe
   * @ignore
   */
  private readonly option: [A?]

  /**
   * Not intended to be used directly. Use `Just`, `Nothing`, or `maybe` exported at the
   * top of the file.
   * @ignore
   */
  private constructor (value: A) {
    this.option = [value]
  }

  /**
   * Wrap a value in a Maybe.
   */
  static Just = <A>(value: A) => new Maybe<A>(value)

  /**
   * Return an empty Maybe.
   */
  static Nothing = <A>() => new Maybe<A>(empty<A>())

  /**
   * Create a Maybe from a nullable value.
   *
   * ```ts
   * maybe(2).getOr(1)         // 2
   * maybe(undefined).getOr(1) // 1
   * ```
   */
  static maybe = <A>(value: A | Nil): Maybe<NonNullable<A>> =>
    exists(value) ? Just(value!) : Nothing()

  /**
   * An alias for `maybe`.
   */
  // tslint:disable-next-line - member-ordering
  static fromNullable = Maybe.maybe

  /**
   * Return `true` or `false` depending on whether there is Just something or Nothing.
   */
  isNothing = () => this.option[0] === this.empty

  /**
   * Use of this function should be discouraged. Use one of the stronger methods below in most
   * cases.
   */
  toNullable = (): A | undefined => this.isNothing() ? undefined : this.option[0]

  /**
   * If the value is Just something, return the Boolean value of it. Otherwise, return false.
   */
  toBoolean = () => this.isNothing() ? false : Boolean(this.toNullable())

  /**
   * If the value of the current Maybe is Nothing, return a default value instaed.
   *
   * ```ts
   * Just(2).getOr(1) // 2
   * Nothing().getOr(1) // 1
   * ```
   */
  getOr = (def: A): A => this.isNothing() ? def : this.option[0]!

  /**
   * If the value of the current Maybe is Nothing, throw the given error message.
   * WARNING: Unsafe - could throw an exception.
   *
   * ```ts
   * Nothing().getOrThrowMessage("It didn't work!") // Error: It didn't work!
   * ```
   */
  getOrThrowMessage = (message: string) => {
    if (!this.isNothing()) {
      return this.option[0] as A
    }

    throw new Error(message)
  }

  /**
   * If the value of the current Maybe is Nothing, throw a default error message.
   * WARNING: Unsafe - could throw an exception.
   *
   * ```ts
   * Nothing().getOrThrow() // Error: Maybe was Nothing
   * ```
   */
  getOrThrow = () => this.getOrThrowMessage('Maybe was Nothing')

  /**
   * Our name for `flatMap`. Allows sequencing of Maybe values and functions that return a Maybe.
   *
   * For example, if you have a Maybe for a display name you might want to do something with it,
   * like split a display name into first and last names:
   *
   * ```ts
   * const squareIfEven = (a: number): Maybe<number> => a % 2 === 0 ? Just(a * a) : Just(a)
   *
   * Just(6).fmap(squareIfEven) // Just(36)
   * ```
   *
   * The `fmap` method allows you to transform the value with a function that accepts it and returns
   * another Maybe.
   *
   * @typeparam B - The type of the resulting value.
   */
  fmap = <B>(func: (value: A) => Maybe<B>): Maybe<B> => !this.isNothing()
    ? func(this.option[0]!)
    : Nothing()

  /**
   * Allows sequencing of Maybe values and functions that accept a Maybe and return a non-Maybe
   * value.
   *
   * ```ts
   * const f = (m: Maybe<number>) => m.getOr(0)
   *
   * Just(2).extend(f)           // Just(2)
   * Nothing<number>().extend(f) // Nothing()
   * ```
   */
  extend = <B>(func: (value: Maybe<A>) => B): Maybe<B> => !this.isNothing()
   ? new Maybe(func(this))
   : Nothing()

  /**
   * Take a function that maps one type to another and lift it to work with Maybes.
   *
   * ```ts
   * const square = (a: number) => a * a
   *
   * Just(6).map(square) // Just(36)
   * ```
   *
   * @typeparam B - The type of the resulting value.
   */
  map = <B>(func: (value: A) => B): Maybe<B> => this.fmap(val => {
    // Work around a type issue with maybe() and NonNullable
    const r = func(val)

    return r ? Just(r) : Nothing()
  })

  /**
   * Replaces the return value with what is provided if there is Nothing.
   */
  instead = (def: A): Maybe<A> => Just(this.getOr(def))

  /**
   * Replaces the return value with what is provided if there is Just something, discarding the
   * original value.
   */
  when = <B>(b: B): Maybe<B> => this.map(_ => b)

  /**
   * Run a side effect if the value is Just something, as opposed to Nothing.
   *
   * For example, if we just want to `console.log()` our Maybe with we can use the `on` function
   * to apply a function to Just values, ignoring the result:
   *
   * ```ts
   * name.on(val => {
   *   console.log('Display name:', val.join(' '))
   * })
   * ```
   */
  on = (callback: (value: A) => void) => this.map(val => {
    callback(val)

    return val
  })

  /**
   * Run a side effect if the value is Nothing.
   */
  unless = (callback: () => void): Maybe<A> => {
    if (this.isNothing()) {
      callback()
    }

    return this
  }

  /**
   * Unpacks a Maybe for a function from `A` to `B` into a function from `Maybe<A>` to `Maybe<B>`.
   * Allows functions contained within a Just to transform a value contained within a Just.
   *
   * ```ts
   * const f = (n: number) => n * 2
   *
   * Just(2).apply(Just(f)) // Just(4)
   * ```
   */
  apply = <B>(m: Maybe<(value: A) => B>): Maybe<B> => this.fmap(val => m.map(func => func(val)))

  /**
   * Returns a Maybe for the value at the given key.
   */
  prop = <P extends keyof A>(key: P): Maybe<NonNullable<A[P]>> => this.fmap(
    val => (val && key in val) ? maybe(val[key]) : Nothing()
  )

  /**
   * If the value is Nothing, returns false. If the value is Just something, returns the boolean
   * value of something.
   *
   * ```ts
   * Just(2).equals(Just(2)) // true
   * ```
   */
  equals = (m: Maybe<A>): boolean => {
    const a = this.option[0]
    const b = m.option[0]

    return !a ? !b : !b ? false : eq(a, b)
  }

  /**
   * The first Maybe that is Just something is returned, otherwise Nothing is returned.
   *
   * ```ts
   * Just(1).alt(Just(2))   // Just(1)
   * Just(2).alt(Nothing()) // Just(2)
   * ```
   */
  alt = (m: Maybe<A>): Maybe<A> => {
    if (!this.isNothing()) {
      return Just(this.option[0] as A)
    }

    if (!m.isNothing()) {
      return Just(m.option[0] as A)
    }

    return Nothing()
  }

  /**
   * Apply a function to each case in the data structure.
   *
   * ```ts
   * const f = 'none'
   * const g = (s: string) => `some${s.length}`
   *
   * Nothing<string>().fold(f, g)) // 'none'
   * Just('abc').fold(f, g))       // 'some3
   * ```
   */
  fold = <B>(b: B, func: (value: A) => B): B => this.map(func).getOr(b)
}

export const Just = Maybe.Just

export const Nothing = Maybe.Nothing

export const maybe = Maybe.maybe
