export class ShuffleBag<T> {
  private remaining: T[] = []
  private last?: T

  constructor(private readonly random: () => number = Math.random) {}

  next(available: readonly T[]) {
    if (!available.length) return undefined
    const allowed = new Set(available)
    this.remaining = this.remaining.filter((value) => allowed.has(value))
    if (!this.remaining.length) {
      this.remaining = [...available]
      for (let index = this.remaining.length - 1; index > 0; index -= 1) {
        const other = Math.floor(this.random() * (index + 1))
        ;[this.remaining[index], this.remaining[other]] = [this.remaining[other], this.remaining[index]]
      }
      if (this.remaining.length > 1 && this.remaining[0] === this.last) {
        ;[this.remaining[0], this.remaining[1]] = [this.remaining[1], this.remaining[0]]
      }
    }
    const value = this.remaining.shift()
    this.last = value
    return value
  }
}
