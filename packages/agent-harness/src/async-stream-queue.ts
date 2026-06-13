/**
 * 轻量级异步流队列 — 将同步回调（push）桥接到 async iterator（for await...of）。
 *
 * 使用场景：LLM provider 的 streamChat 使用回调模式推送 chunk，
 * 而 runner 是 async generator 需要通过 yield 发出事件。
 * AsyncStreamQueue 作为中间层，让回调中的数据能被 async iterator 消费。
 */
export class AsyncStreamQueue<T> {
  private buffer: T[] = [];
  private resolveNext: ((value: IteratorResult<T>) => void) | null = null;
  private ended = false;
  private err: Error | null = null;

  /** 推入一个数据项。如有等待中的消费者，直接 resolve；否则入队。 */
  push(item: T): void {
    if (this.ended) return; // 流已关闭，静默忽略
    if (this.resolveNext) {
      this.resolveNext({ value: item, done: false });
      this.resolveNext = null;
    } else {
      this.buffer.push(item);
    }
  }

  /** 标记流正常结束。 */
  close(): void {
    this.ended = true;
    this.flushOrEnd();
  }

  /** 标记流异常结束。后续 next() 将抛出此错误。 */
  setError(err: Error): void {
    this.err = err;
    this.ended = true;
    this.flushOrEnd();
  }

  /** 如果有等待中的消费者，通知结束；否则等待下次 next() */
  private flushOrEnd(): void {
    if (this.resolveNext) {
      if (this.err) {
        // 错误优先 — resolve 不抛，让 next() 处理
        this.resolveNext({ value: undefined as unknown as T, done: true });
      } else {
        this.resolveNext({ value: undefined as unknown as T, done: true });
      }
      this.resolveNext = null;
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const self = this;

    return {
      async next(): Promise<IteratorResult<T>> {
        // 错误优先
        if (self.err) throw self.err;

        // 缓冲区有数据，立即返回
        if (self.buffer.length > 0) {
          return { value: self.buffer.shift()!, done: false };
        }

        // 流已结束且无数据
        if (self.ended) {
          return { value: undefined as unknown as T, done: true };
        }

        // 等待新数据或流结束
        return new Promise<IteratorResult<T>>((resolve) => {
          self.resolveNext = resolve;
          // 竞态重检：在注册 resolveNext 期间可能已有数据入队或流结束
          if (self.buffer.length > 0 || self.ended) {
            self.resolveNext = null;
            if (self.buffer.length > 0) {
              resolve({ value: self.buffer.shift()!, done: false });
            } else {
              resolve({ value: undefined as unknown as T, done: true });
            }
          }
        });
      },
    };
  }
}
