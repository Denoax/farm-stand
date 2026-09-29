import type { SoundscapeSnapshot } from '../audio/useSoundscape'

interface SoundControlsProps {
  snapshot: SoundscapeSnapshot
  onToggle: () => void
}

export function SoundControls({ snapshot, onToggle }: SoundControlsProps) {
  const label = snapshot.musicPlaying
    ? 'Mute background music'
    : snapshot.musicStarting
      ? 'Cancel background music request'
    : snapshot.musicBlocked
      ? 'Play background music; browser permission is needed'
      : 'Play background music'
  return (
    <div className="sound-controls" data-sound-ready={snapshot.audioReady ? 'true' : 'false'} data-sound-status={snapshot.status}>
      <button
        type="button"
        className="music-toggle"
        aria-label={label}
        title={label}
        aria-pressed={snapshot.musicPlaying}
        data-music-state={snapshot.musicPlaying ? 'playing' : snapshot.musicStarting ? 'starting' : snapshot.musicBlocked ? 'blocked' : snapshot.musicMuted ? 'muted' : 'requested'}
        data-opening-preserve="true"
        onClick={() => void onToggle()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21">
          <path d="M4.5 9.2h3.2l4.2-3.4v12.4l-4.2-3.4H4.5V9.2Z" fill="currentColor" />
          <path d="M15 9a4.4 4.4 0 0 1 0 6M17.4 6.7a7.7 7.7 0 0 1 0 10.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {!snapshot.musicPlaying && <path d="m4.2 4.2 15.6 15.6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />}
        </svg>
      </button>
      {snapshot.musicBlocked && <span className="visually-hidden" role="status">Music was blocked. Activate the music button to try again.</span>}
    </div>
  )
}
