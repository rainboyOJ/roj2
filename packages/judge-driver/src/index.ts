// 这是与 judge_server 通信的底层 TypeScript 客户端。
// 核心职责：
// - 按 judge 协议做长度前缀 + JSON 编解码
// - 管理 TCP 会话
// - 提供 submit / query_result / submitAndWait / submitAndPoll 的高层 API
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export const Language = {
  CPP: 0,
  C: 1,
  PYTHON: 2,
} as const;

export type LanguageValue = (typeof Language)[keyof typeof Language];

export type SubmissionStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'COMPILING'
  | 'RUNNING'
  | 'FINISHED'
  | 'FAILED';

export type SubmissionVerdict =
  | 'PENDING'
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'MLE'
  | 'RE'
  | 'OLE'
  | 'PE'
  | 'CE'
  | 'UNKNOWN'
  | 'SYSTEM_ERROR';

export interface SubmissionCaseResult {
  seq_id: number;
  verdict: SubmissionVerdict;
  cpu_time_ms: number;
  real_time_ms: number;
  memory_kb: number;
  signal: number;
  exit_code: number;
  error_code: number;
}

export interface SubmitRequestInput {
  uuid: number;
  pid: string;
  lang: LanguageValue;
  code: string;
}

export interface SubmitRequest extends SubmitRequestInput {
  type: 'submit';
}

export interface QueryResultRequest {
  type: 'query_result';
  submission_id: number;
}

export interface SubmissionAckResponse {
  type: 'submission_ack';
  submission_id: number;
  status: SubmissionStatus;
  verdict: SubmissionVerdict;
  message: string;
  case_results: SubmissionCaseResult[];
}

export interface SubmissionUpdateResponse {
  type: 'submission_update';
  submission_id: number;
  status: SubmissionStatus;
  verdict: SubmissionVerdict;
  message: string;
  case_results: SubmissionCaseResult[];
}

export interface SubmissionFinishedResponse {
  type: 'submission_finished';
  submission_id: number;
  status: SubmissionStatus;
  verdict: SubmissionVerdict;
  message: string;
  case_results: SubmissionCaseResult[];
}

export interface ErrorResponse {
  submission_id: number;
  status: SubmissionStatus;
  verdict: SubmissionVerdict;
  message: string;
  code: number;
  msg: string;
  case_results: SubmissionCaseResult[];
}

export type JudgeServerRequest = SubmitRequest | QueryResultRequest;
export type JudgeServerResponse =
  | SubmissionAckResponse
  | SubmissionUpdateResponse
  | SubmissionFinishedResponse
  | ErrorResponse;

export type QueryResultResponse =
  | SubmissionUpdateResponse
  | SubmissionFinishedResponse;

export interface WaitOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface JudgeServerClientOptions {
  host?: string;
  port?: number;
  connectTimeoutMs?: number;
  responseTimeoutMs?: number;
  pollIntervalMs?: number;
}

export interface SubmitAndWaitOptions extends WaitOptions {
  onMessage?: (
    message: SubmissionUpdateResponse | SubmissionFinishedResponse,
  ) => void;
}

export interface SubmitAndPollOptions extends WaitOptions {
  pollIntervalMs?: number;
  onSnapshot?: (message: QueryResultResponse) => void;
}

export interface SubmitAndWaitResult {
  ack: SubmissionAckResponse;
  final: SubmissionFinishedResponse;
}

export interface SubmitAndPollResult {
  ack: SubmissionAckResponse;
  final: SubmissionFinishedResponse;
}

function withWaitOptions(
  timeoutMs: number | undefined,
  signal: AbortSignal | undefined,
): WaitOptions {
  return {
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(signal === undefined ? {} : { signal }),
  };
}

function withSubmitAndWaitOptions(
  options: SubmitAndWaitOptions,
  timeoutMs: number | undefined,
): SubmitAndWaitOptions {
  return {
    ...options,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
}

export class JudgeProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JudgeProtocolError';
  }
}

export class JudgeTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JudgeTimeoutError';
  }
}

export class JudgeServerError extends Error {
  response: ErrorResponse;

  constructor(response: ErrorResponse) {
    super(response.message);
    this.name = 'JudgeServerError';
    this.response = response;
  }
}

function createSubmitRequest(input: SubmitRequestInput): SubmitRequest {
  return {
    type: 'submit',
    uuid: input.uuid,
    pid: input.pid,
    lang: input.lang,
    code: input.code,
  };
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isErrorResponse(
  message: JudgeServerResponse,
): message is ErrorResponse {
  return !('type' in message);
}

export function isSubmissionAckResponse(
  message: JudgeServerResponse,
): message is SubmissionAckResponse {
  return !isErrorResponse(message) && message.type === 'submission_ack';
}

export function isSubmissionUpdateResponse(
  message: JudgeServerResponse,
): message is SubmissionUpdateResponse {
  return !isErrorResponse(message) && message.type === 'submission_update';
}

export function isSubmissionFinishedResponse(
  message: JudgeServerResponse,
): message is SubmissionFinishedResponse {
  return !isErrorResponse(message) && message.type === 'submission_finished';
}

export function isTerminalResponse(message: JudgeServerResponse): boolean {
  return (
    isErrorResponse(message) ||
    isSubmissionFinishedResponse(message) ||
    message.status === 'FINISHED' ||
    message.status === 'FAILED'
  );
}

function assertServerResponseShape(value: unknown): JudgeServerResponse {
  if (!isObjectLike(value)) {
    throw new JudgeProtocolError('judge server response is not a JSON object');
  }

  if (
    typeof value.submission_id !== 'number' ||
    typeof value.status !== 'string' ||
    typeof value.verdict !== 'string' ||
    typeof value.message !== 'string' ||
    !Array.isArray(value.case_results)
  ) {
    throw new JudgeProtocolError('judge server response is missing required fields');
  }

  if ('type' in value) {
    if (
      value.type !== 'submission_ack' &&
      value.type !== 'submission_update' &&
      value.type !== 'submission_finished'
    ) {
      throw new JudgeProtocolError(
        `unsupported judge server response type: ${String(value.type)}`,
      );
    }
    return value as unknown as JudgeServerResponse;
  }

  if (typeof value.code !== 'number' || typeof value.msg !== 'string') {
    throw new JudgeProtocolError('judge server error response is missing code/msg');
  }

  return value as unknown as JudgeServerResponse;
}

function encodeRequestFrame(request: JudgeServerRequest): Buffer {
  const body = Buffer.from(JSON.stringify(request), 'utf8');
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

class FramedJsonDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): JudgeServerResponse[] {
    // TCP 是流，不保证一次 data 事件就是一个完整消息，
    // 所以这里需要手工做拆包 / 粘包处理。
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: JudgeServerResponse[] = [];

    while (this.buffer.length >= 4) {
      const bodyLength = this.buffer.readUInt32BE(0);
      const frameLength = 4 + bodyLength;
      if (this.buffer.length < frameLength) {
        break;
      }

      const body = this.buffer.subarray(4, frameLength);
      this.buffer = this.buffer.subarray(frameLength);

      let parsed: unknown;
      try {
        parsed = JSON.parse(body.toString('utf8'));
      } catch (error) {
        throw new JudgeProtocolError(
          `failed to parse judge server JSON response: ${String(error)}`,
        );
      }

      messages.push(assertServerResponseShape(parsed));
    }

    return messages;
  }
}

function makeSessionClosedError(): Error {
  return new Error('judge session closed');
}

function remainingTimeoutMs(startedAt: number, timeoutMs?: number): number | undefined {
  if (timeoutMs === undefined) {
    return undefined;
  }

  const elapsed = Date.now() - startedAt;
  const remaining = timeoutMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new Error('operation aborted');
  }
}

type Waiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

export class JudgeSession {
  private host: string;
  private port: number;
  private connectTimeoutMs: number;
  private responseTimeoutMs: number;
  private socket: net.Socket | null = null;
  private connected = false;
  private manuallyClosed = false;
  private decoder = new FramedJsonDecoder();
  private queuedMessages: JudgeServerResponse[] = [];
  private waiters: Waiter[] = [];
  private terminalError: Error | null = null;

  constructor(options: JudgeServerClientOptions = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port ?? 8000;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 3000;
    this.responseTimeoutMs = options.responseTimeoutMs ?? 30000;
  }

  async connect(signal?: AbortSignal): Promise<void> {
    // JudgeSession 表示一个和 judge_server 的 TCP 会话。
    // connect 成功后，后续 submit / nextMessage 都在这条连接上完成。
    if (this.connected) {
      return;
    }

    throwIfAborted(signal);

    const socket = new net.Socket();
    socket.setNoDelay(true);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        reject(
          new JudgeTimeoutError(
            `timed out while connecting to ${this.host}:${this.port}`,
          ),
        );
      }, this.connectTimeoutMs);

      const onAbort = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        socket.destroy();
        reject(
          signal?.reason instanceof Error
            ? signal.reason
            : new Error('connection aborted'),
        );
      };

      const onConnect = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };

      const onError = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      };

      signal?.addEventListener('abort', onAbort, { once: true });
      socket.once('connect', onConnect);
      socket.once('error', onError);
      socket.connect(this.port, this.host);
    });

    socket.removeAllListeners('error');
    socket.on('data', (chunk: Buffer) => {
      try {
        const messages = this.decoder.push(chunk);
        for (const message of messages) {
          this.queuedMessages.push(message);
          this.flushWaiters();
        }
      } catch (error) {
        this.failSession(
          error instanceof Error
            ? error
            : new JudgeProtocolError(String(error)),
        );
      }
    });
    socket.on('error', (error) => {
      this.failSession(error);
    });
    socket.on('close', () => {
      if (!this.terminalError) {
        this.failSession(makeSessionClosedError());
      }
    });
    this.connected = true;
  }

  async send(request: JudgeServerRequest): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error('judge session is not connected');
    }

    const frame = encodeRequestFrame(request);
    await new Promise<void>((resolve, reject) => {
      this.socket!.write(frame, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async nextMessage(options: WaitOptions = {}): Promise<JudgeServerResponse> {
    // 这是读取协议消息的统一入口：
    // 先看本地队列，再等 socket 推送，再处理超时 / abort / session error。
    const timeoutMs = options.timeoutMs ?? this.responseTimeoutMs;
    const startedAt = Date.now();

    while (true) {
      throwIfAborted(options.signal);

      if (this.queuedMessages.length > 0) {
        return this.queuedMessages.shift()!;
      }

      if (this.terminalError) {
        throw this.terminalError;
      }

      const remaining = remainingTimeoutMs(startedAt, timeoutMs);
      if (remaining !== undefined && remaining <= 0) {
        throw new JudgeTimeoutError('timed out while waiting for judge server response');
      }

      await this.waitForIncomingMessage(remaining, options.signal);
    }
  }

  async submit(
    input: SubmitRequestInput,
    options: WaitOptions = {},
  ): Promise<SubmissionAckResponse> {
    await this.send(createSubmitRequest(input));
    const message = await this.nextMessage(
      withWaitOptions(options.timeoutMs, options.signal),
    );

    if (isErrorResponse(message)) {
      throw new JudgeServerError(message);
    }
    if (!isSubmissionAckResponse(message)) {
      throw new JudgeProtocolError(
        `expected submission_ack, received ${message.type}`,
      );
    }

    return message;
  }

  async waitForFinal(options: SubmitAndWaitOptions = {}): Promise<SubmissionFinishedResponse> {
    // submitAndWait 模式下，judge_server 会在同一连接上持续推送 update/finished。
    const timeoutMs = options.timeoutMs ?? this.responseTimeoutMs;
    const startedAt = Date.now();

    while (true) {
      const message = await this.nextMessage(
        withWaitOptions(
          remainingTimeoutMs(startedAt, timeoutMs),
          options.signal,
        ),
      );

      if (isErrorResponse(message)) {
        throw new JudgeServerError(message);
      }

      if (isSubmissionUpdateResponse(message)) {
        options.onMessage?.(message);
        continue;
      }

      if (isSubmissionFinishedResponse(message)) {
        options.onMessage?.(message);
        return message;
      }

      if (isSubmissionAckResponse(message)) {
        continue;
      }

      throw new JudgeProtocolError('unexpected response while waiting for final result');
    }
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    if (!this.terminalError) {
      this.failSession(makeSessionClosedError());
    }
  }

  private waitForIncomingMessage(
    timeoutMs: number | undefined,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout | undefined;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        signal?.removeEventListener('abort', onAbort);
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
      };

      const finishResolve = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const onAbort = () => {
        finishReject(
          signal?.reason instanceof Error
            ? signal.reason
            : new Error('operation aborted'),
        );
      };

      const waiter: Waiter = {
        resolve: finishResolve,
        reject: finishReject,
      };

      this.waiters.push(waiter);
      if (timeoutMs !== undefined) {
        timeoutId = setTimeout(() => {
          finishReject(
            new JudgeTimeoutError(
              'timed out while waiting for judge server response',
            ),
          );
        }, timeoutMs);
      }
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private flushWaiters(): void {
    while (this.waiters.length > 0 && this.queuedMessages.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter.resolve();
    }
  }

  private failSession(error: Error): void {
    if (this.terminalError) {
      return;
    }

    this.terminalError = this.manuallyClosed ? makeSessionClosedError() : error;
    this.connected = false;
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      waiter.reject(this.terminalError);
    }
  }
}

export class JudgeServerClient {
  private options: JudgeServerClientOptions;

  constructor(options: JudgeServerClientOptions = {}) {
    this.options = options;
  }

  async createSession(signal?: AbortSignal): Promise<JudgeSession> {
    const session = new JudgeSession(this.options);
    await session.connect(signal);
    return session;
  }

  async submit(
    request: SubmitRequestInput,
    options: WaitOptions = {},
  ): Promise<SubmissionAckResponse> {
    const session = await this.createSession(options.signal);
    try {
      return await session.submit(request, options);
    } finally {
      session.close();
    }
  }

  async queryResult(
    submissionId: number,
    options: WaitOptions = {},
  ): Promise<QueryResultResponse> {
    const session = await this.createSession(options.signal);
    try {
      await session.send({
        type: 'query_result',
        submission_id: submissionId,
      });
      const message = await session.nextMessage(
        withWaitOptions(options.timeoutMs, options.signal),
      );

      if (isErrorResponse(message)) {
        throw new JudgeServerError(message);
      }
      if (
        !isSubmissionUpdateResponse(message) &&
        !isSubmissionFinishedResponse(message)
      ) {
        throw new JudgeProtocolError(
          `expected submission_update or submission_finished, received ${message.type}`,
        );
      }

      return message;
    } finally {
      session.close();
    }
  }

  async submitAndWait(
    request: SubmitRequestInput,
    options: SubmitAndWaitOptions = {},
  ): Promise<SubmitAndWaitResult> {
    const startedAt = Date.now();
    const session = await this.createSession(options.signal);
    try {
      const ack = await session.submit(
        request,
        withWaitOptions(
          remainingTimeoutMs(startedAt, options.timeoutMs),
          options.signal,
        ),
      );
      const final = await session.waitForFinal(
        withSubmitAndWaitOptions(
          options,
          remainingTimeoutMs(startedAt, options.timeoutMs),
        ),
      );
      return { ack, final };
    } finally {
      session.close();
    }
  }

  async submitAndPollUntilFinished(
    request: SubmitRequestInput,
    options: SubmitAndPollOptions = {},
  ): Promise<SubmitAndPollResult> {
    // 这是“短连接轮询”模式：
    // submit 一次拿 ack，之后每轮单独 query_result，直到收到 finished。
    // timeoutMs 是整个 submit + poll 流程的总超时时间，不是单次请求的超时时间。
    const timeoutMs =
      options.timeoutMs ?? this.options.responseTimeoutMs ?? 30000;
    // pollIntervalMs 控制两次 query_result 之间的等待时间，避免对 judge_server 打太密。
    const pollIntervalMs =
      options.pollIntervalMs ?? this.options.pollIntervalMs ?? 500;
    const startedAt = Date.now();

    // 第一步先提交代码。ack.submission_id 是 judge_server 分配的提交 ID，
    // 后续 query_result 都要用这个 ID 查询评测进度。
    const ack = await this.submit(
      request,
      withWaitOptions(
        remainingTimeoutMs(startedAt, timeoutMs),
        options.signal,
      ),
    );

    while (true) {
      // 每一轮都重新计算剩余总时间，保证整个函数不会超过 timeoutMs。
      const remaining = remainingTimeoutMs(startedAt, timeoutMs);
      if (remaining !== undefined && remaining <= 0) {
        throw new JudgeTimeoutError(
          `timed out while polling submission ${ack.submission_id}`,
        );
      }

      // 等待一个轮询间隔。如果剩余时间比轮询间隔短，就只等待剩余时间。
      // delay 同样接收 AbortSignal，调用方可以中途取消整个等待流程。
      await delay(Math.min(pollIntervalMs, remaining ?? pollIntervalMs), undefined, {
        signal: options.signal,
      });

      // 使用 judge_server 返回的 submission_id 查询当前快照。
      // queryResult 内部会为这次查询单独建立连接，查询完后关闭连接。
      const snapshot = await this.queryResult(
        ack.submission_id,
        withWaitOptions(
          remainingTimeoutMs(startedAt, timeoutMs),
          options.signal,
        ),
      );
      // 把每次轮询到的快照交给调用方，便于打印日志或持久化中间状态。
      options.onSnapshot?.(snapshot);

      // 只有收到 submission_finished 才认为评测完成。
      // 其他 update 状态会继续进入下一轮轮询。
      if (isSubmissionFinishedResponse(snapshot)) {
        return {
          ack,
          final: snapshot,
        };
      }
    }
  }
}
