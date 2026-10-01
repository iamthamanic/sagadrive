/**
 * Adaptive shared UI primitives — barrel (#482).
 * Location: src/shared/ui/adaptive/index.ts
 *
 * Presentation-only. No auth, session, or feature business rules.
 */
export {
  ADAPTIVE_PHONE_MAX_PX,
  ADAPTIVE_TABLET_MAX_PX,
  isCompactBand,
  isPhoneBand,
  resolveAdaptiveBand,
  useAdaptiveBand,
  type AdaptiveBand,
} from './bands';
export { AdaptivePage, type AdaptivePageProps } from './AdaptivePage';
export {
  AdaptiveActionBar,
  type AdaptiveActionBarProps,
} from './AdaptiveActionBar';
export { AdaptiveToolbar, type AdaptiveToolbarProps } from './AdaptiveToolbar';
export {
  AdaptiveSheet,
  AdaptiveSheetClose,
  AdaptiveSheetContent,
  AdaptiveSheetDescription,
  AdaptiveSheetFooter,
  AdaptiveSheetHeader,
  AdaptiveSheetTitle,
  AdaptiveSheetTrigger,
  type AdaptiveSheetContentProps,
  type AdaptiveSheetSide,
} from './AdaptiveSheet';
export {
  AdaptiveInspector,
  type AdaptiveInspectorProps,
} from './AdaptiveInspector';
export {
  AdaptiveMasterDetail,
  type AdaptiveMasterDetailProps,
} from './AdaptiveMasterDetail';
export {
  AdaptiveLiveStage,
  type AdaptiveLiveStageProps,
} from './AdaptiveLiveStage';
