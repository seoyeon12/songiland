import { useId } from 'react';
import { MeetingCard } from '../components/MeetingCard';
import { NameForm } from '../components/NameForm';
import { PortalLink } from '../components/PortalLink';
import { previewMeeting } from '../engine';

export type MeetingScreenProps = {
  seed: number;
  onAdopt: (name: string) => void;
  onBack: () => void;
};

export function MeetingScreen({ seed, onAdopt, onBack }: MeetingScreenProps) {
  const meeting = previewMeeting(seed);
  const titleId = useId();

  return (
    <div className="app">
      <nav className="app__topbar" aria-label="송이랜드">
        <PortalLink />
      </nav>
      <main className="app__main">
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>🐾</span> 오늘 만난 아이
          </span>
        </header>

        <section className="app__card meeting" aria-labelledby={titleId}>
          <MeetingCard meeting={meeting} titleId={titleId} heading="h1" />
          <NameForm suggestions={meeting.suggestedNames} onSubmit={onAdopt}>
            <button type="button" className="btn btn--ghost" onClick={onBack}>
              처음으로
            </button>
          </NameForm>
        </section>
      </main>
    </div>
  );
}
