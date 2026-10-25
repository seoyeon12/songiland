export { ARCS, toneWeights } from './data/arcs';
export { EVENTS } from './events/catalog';
export { getEvent } from './events/picker';
export { render } from './events/template';
export type { EventCard } from './events/types';
export { BREEDS, getBreed, getCoat, HEALTH_LABELS } from './data/breeds';
export { TRAITS, traitLabel } from './data/traits';
export { drawMeeting, nicknameFor, ROUTE_LABELS } from './meeting';
export { formatAge, formatMonths, pickHighlights, summarize, type RunRecord } from './record';
export { createRng, type Rng } from './rng';
export {
  advanceMonth,
  advanceUntilChoice,
  arcTitle,
  autoChoose,
  choose,
  MS_PER_MONTH,
  previewMeeting,
  simulateToEnd,
  startRun,
} from './simulation';
export { moodFor, STAGE_LABELS, stageFor } from './stages';
export { josa } from './text/josa';
export type * from './types';
