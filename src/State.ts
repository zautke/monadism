/**
 * State is a Monad with the operations `get` and `put`, which can be used to model a single piece
 * of mutable state.
 */
export default class State<S, A> {
  /** @ignore */
  private run: (s: S) => [A, S]

  /** @ignore */
  private constructor (run: (s: S) => [A, S]) {
    this.run = run
  }

  /** @ignore */
  static get = <S>(): State<S, S> => new State(s => [s, s])

  /** @ignore */
  static put = <S>(s: S): State<S, undefined> => new State(() => [undefined, s])

  /**
   * Create a new state that will replace the return value when run.
   */
  static of = <S, A>(a: A): State<S, A> => new State(s => [a, s])

  /** @ignore */
  static modify = <S>(func: (s: S) => S): State<S, undefined> =>
    new State(s => [undefined, func(s)])

  /** @ignore */
  static gets = <S, A>(func: (s: S) => A): State<S, A> => new State(s => [func(s), s])

  /**
   * Run a computation, discarding the final state.
   */
  eval = (s: S) => this.run(s)[0]

  /**
   * Run a computation, discarding the result.
   */
  exec = (s: S) => this.run(s)[1]

  /**
   * Change the type of the result in an action.
   *
   * ```ts
   * const double = (n: number) => n * 2
   *
   * const state = State.of(1).map(double)
   *
   * state.eval(0) // 2
   * ```
   */
  map = <B>(func: (a: A) => B): State<S, B> => new State(s => {
    const [a, s1] = this.run(s)

    return [func(a), s1]
  })

  /**
   * Bind a new computation to the State, transforming the result.
   *
   * ```ts
   * const double = (n: number) => n * 2
   *
   * const state = State.of(1).then(a => put(double(a)))
   *
   * state.exec(0) // 2
   * ```
   */
  then = <B>(func: (a: A) => State<S, B>) => new State<S, B>(s => {
    const [a, s1] = this.run(s)

    return func(a).run(s1)
  })

  /**
   * Apply a function in the result of one State to the result in this State.
   *
   * ```ts
   * const doubled = State.of(double)
   * const initial = State.of(1)
   *
   * const state = initial.apply(doubled)
   *
   * state.eval(0) // 2
   * ```
   */
  apply = <B>(m: State<S, (a: A) => B>): State<S, B> => m.then(func => this.map(func))
}

/**
 * Get the current state.
 *
 * ```ts
 * const state = get()
 *
 * state.eval(1) // 1
 * state.exec(1) // 1
 * ```
 */
export const get = State.get

/**
 * Set the state.
 *
 * ```ts
 * const state = put(2)
 *
 * state.eval(1) // undefined
 * state.exec(1) // 2
 * ```
 */
export const put = State.put

/**
 * Modify the state by applying a function to the current state.
 *
 * ```ts
 * const double = (n: number) => n * 2
 *
 * const state = modify(double)
 *
 * state.eval(1) // undefined
 * state.exec(1) // 2
 * ```
 */
export const modify = State.modify

/**
 * Get a value which depends on the current state.
 *
 * ```ts
 * const state = gets(double)
 *
 * state.eval(1) // 2
 * state.exec(1) // 1
 * ```
 */
export const gets = State.gets
