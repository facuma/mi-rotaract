'use client';

import { useParams } from 'next/navigation';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { TimerDisplay } from '@/components/TimerDisplay';

export default function ProjectorPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected } = useMeetingRoom(meetingId);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        fontSize: 'clamp(1rem, 4vw, 2rem)',
        background: '#111',
        color: '#fff',
      }}
    >
      {!connected && <p style={{ opacity: 0.7 }}>Conectando...</p>}
      {snapshot && (
        <>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>{snapshot.status}</p>
          {snapshot.activeTimer && (
            <div style={{ marginBottom: '1rem', fontSize: '2em' }}>
              <TimerDisplay remainingSec={snapshot.activeTimer.remainingSec} overtimeSec={snapshot.activeTimer.overtimeSec} />
            </div>
          )}
          <p style={{ fontSize: '1.5em', marginBottom: '0.5rem' }}>
            Tema actual: {snapshot.currentTopic?.title ?? '—'}
          </p>
          {snapshot.currentSpeaker && (
            <p style={{ fontSize: '1.2em' }}>Orador: {snapshot.currentSpeaker.fullName}</p>
          )}
          {snapshot.activeVoteSession && (
            <div style={{ marginTop: '2rem', border: '2px solid #fff', padding: '1rem', borderRadius: 8 }}>
              <p><strong>Moción en votación</strong></p>
              <p>{snapshot.activeVoteSession.topicTitle}</p>
            </div>
          )}
          {voteResult && !snapshot.activeVoteSession && (
            <div style={{ marginTop: '2rem' }}>
              <VoteResultSummary
                yes={voteResult.yes}
                no={voteResult.no}
                abstain={voteResult.abstain}
                total={voteResult.total}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
