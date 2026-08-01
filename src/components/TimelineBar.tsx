import React from 'react';
import { Play, Pause, FileBarChart } from 'lucide-react';
import { useStore } from '../store/useStore';

interface Props {
  onCommand: (action: string, data?: any) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const speeds = [0, 0.25, 0.5, 1, 2, 5, 10, 100];

export function TimelineBar({ onCommand }: Props) {
  const store = useStore();

  const handlePlayPause = () => {
    if (store.paused) {
      store.setPaused(false);
      onCommand('resume');
    } else {
      store.setPaused(true);
      onCommand('pause');
    }
  };

  const handleSpeedChange = (speed: number) => {
    store.setSpeed(speed);
    if (speed === 0) {
      onCommand('pause');
    } else {
      onCommand('resume');
      onCommand('set_speed', { speed });
    }
  };

  const totalTime = 3600; // 1 hour default scenario
  const progress = Math.min(100, (store.simTime / totalTime) * 100);

  return (
    <div className="timeline-bar" role="region" aria-label="Simulation timeline">
      <button className="play-btn" onClick={handlePlayPause} aria-label={store.paused ? 'Play' : 'Pause'}>
        {store.paused ? <Play size={14} /> : <Pause size={14} />}
      </button>

      <select
        className="speed-select"
        value={store.speed}
        onChange={(e) => handleSpeedChange(Number(e.target.value))}
        aria-label="Simulation speed"
      >
        {speeds.map((s) => (
          <option key={s} value={s}>
            {s === 0 ? 'Paused' : s === 100 ? 'Max' : `${s}×`}
          </option>
        ))}
      </select>

      <div className="sim-time" aria-label="Simulation time">
        {formatTime(store.simTime)}
      </div>

      <div className="timeline-track" role="slider" aria-label="Timeline" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        {store.actionLog.slice(-20).map((log, i) => {
          const pos = Math.min(100, (log.sim_time / totalTime) * 100);
          return <div key={i} className="timeline-marker action" style={{ left: `${pos}%` }} title={`${log.user}: ${log.action}`} />;
        })}
        {store.snapshot?.incidents.map((inc, i) => {
          const pos = Math.min(100, (store.simTime / totalTime) * 100);
          return <div key={`inc-${i}`} className="timeline-marker incident" style={{ left: `${pos}%` }} title={inc.kind} />;
        })}
        <div className="timeline-label">{store.paused ? 'PAUSED' : 'LIVE'}</div>
      </div>

      <button
        className="play-btn"
        onClick={() => onCommand('request_report')}
        aria-label="Generate report"
        title="Generate Report"
      >
        <FileBarChart size={14} />
      </button>
    </div>
  );
}
