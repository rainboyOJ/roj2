// 这里不自己实现 judge 协议，而是直接复用 drivers/typescript 里的客户端实现。
// 这样 apps/* 只依赖 workspace 内的 package，不需要直接引用 handoff 目录。
export * from '../../../drivers/typescript/src/index.ts';
