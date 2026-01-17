import pc from 'picocolors';
import { writePromotePlan } from './promotePlan.js';

export async function promoteStubs(opts: { root: string; outFile: string; minRefs: number }): Promise<number> {
  return writePromotePlan({ root: opts.root, outFile: opts.outFile, minRefs: opts.minRefs });
}

export async function promoteStubsApply(opts: { root: string; planFile: string; write: boolean }): Promise<number> {
  const { applyPromotePlan } = await import('./promotePlan.js');
  return applyPromotePlan({ root: opts.root, planFile: opts.planFile, write: opts.write });
}
