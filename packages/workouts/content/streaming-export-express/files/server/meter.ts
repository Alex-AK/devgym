import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * The byte counter. No real service has one: in production this number is the
 * memory graph, read after the fact. Here a checkpoint reads it directly.
 *
 * It wraps `write` and `end` and samples `res.writableLength` straight after
 * each call, which is the only moment the number can grow: a response buffers
 * when something writes to it, and shrinks on its own as the socket drains.
 * `writableLength` is what the response is holding on to right now, in bytes,
 * across its own buffer and the socket's.
 */
export class ResponseMeter {
  /** The most bytes this response has ever had queued at once. */
  peakBufferedBytes = 0;

  /** How many bytes the handler has handed over, queued or not. */
  bytesWritten = 0;

  middleware(): RequestHandler {
    return (_req: Request, res: Response, next: NextFunction): void => {
      const write = res.write.bind(res) as (...args: unknown[]) => boolean;
      const end = res.end.bind(res) as (...args: unknown[]) => Response;

      res.write = ((...args: unknown[]) => {
        this.count(args[0]);
        const accepted = write(...args);
        this.sample(res);
        return accepted;
      }) as Response['write'];

      res.end = ((...args: unknown[]) => {
        this.count(args[0]);
        const returned = end(...args);
        this.sample(res);
        return returned;
      }) as Response['end'];

      next();
    };
  }

  private count(chunk: unknown): void {
    if (typeof chunk === 'string') this.bytesWritten += Buffer.byteLength(chunk);
    else if (Buffer.isBuffer(chunk)) this.bytesWritten += chunk.length;
  }

  private sample(res: Response): void {
    if (res.writableLength > this.peakBufferedBytes) this.peakBufferedBytes = res.writableLength;
  }
}
