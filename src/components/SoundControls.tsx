import type { SoundscapeSnapshot } from '../audio/useSoundscape'

interface SoundControlsProps {
  snapshot: SoundscapeSnapshot
  onToggle: () => void
}

export function SoundControls({ snapshot, onToggle }: SoundControlsProps) {
  const label = snapshot.musicPlaying ? 'Pause background music' : 'Play background music'
  return (
    <div className="sound-controls" data-sound-ready={snapshot.audioReady ? 'true' : 'false'} data-sound-status={snapshot.status}>
      <button
        type="button"
        className="music-toggle"
        aria-label={label}
        title={label}
        aria-pressed={snapshot.musicPlaying}
        data-opening-preserve="true"
        onClick={() => void onToggle()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21">
          <path d="M9 18V6.7l10-2.1v10.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="6.4" cy="18.1" rx="3.1" ry="2.3" fill="currentColor" />
          <ellipse cx="16.5" cy="14.8" rx="3.1" ry="2.3" fill="currentColor" />
          {!snapshot.musicPlaying && <path d="m4.2 4.2 15.6 15.6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />}
        </svg>
      </button>
      {snapshot.musicBlocked && <span className="visually-hidden" role="status">Music was blocked. Activate the music button to try again.</span>}
    </div>
  )
}
