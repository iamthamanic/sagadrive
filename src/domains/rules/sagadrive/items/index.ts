/**
 * sagadrive items rules slice — public API for §5.7 / §8.3 / §10 item mechanics.
 * Location: src/domains/rules/sagadrive/items/index.ts
 *
 * Inventory v2 re-exports rule types for compatibility; this barrel is the
 * canonical owner of load/cost/protection/trait/Traglast/tool contracts.
 */
export * from './types';
export * from './validators';
export * from './carry-capacity';
export * from './tool-rules';
