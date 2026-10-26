export { ARCS, toneWeights } from './data/arcs';
export { EVENTS } from './events/catalog';
export { getEvent, newcomerOpen } from './events/picker';
export { render } from './events/template';
export type { EventCard } from './events/types';
export { BREEDS, getBreed, getCoat, HEALTH_LABELS } from './data/breeds';
export { TRAITS, traitLabel } from './data/traits';
export { drawMeeting, nicknameFor, ROUTE_LABELS } from './meeting';
export { isAlive, livingDogs, MAX_DOGS, rapportBetween } from './family';
export {
  formatAge,
  formatMonths,
  pickHighlights,
  summarize,
  type DogSummary,
  type FamilyRecord,
  type Moment,
  type RunRecord,
} from './record';
export { createRng, type Rng } from './rng';
export {
  advanceMonth,
  advanceUntilChoice,
  arcTitle,
  autoChoose,
  autoWelcome,
  choose,
  MS_PER_MONTH,
  previewMeeting,
  simulateToEnd,
  startRun,
  welcome,
} from './simulation';
export { moodFor, STAGE_LABELS, stageFor } from './stages';
export { josa } from './text/josa';
export type * from './types';
