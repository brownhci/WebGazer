import { useCallback, useState } from 'react';

const CLICKS_REQUIRED = 5;

/** Nine calibration targets in viewport-relative positions (%, %). */
const CALIBRATION_POSITIONS: { id: string; top: string; left: string }[] = [
  { id: 'Pt1', top: '8%', left: '8%' },
  { id: 'Pt2', top: '8%', left: '50%' },
  { id: 'Pt3', top: '8%', left: '92%' },
  { id: 'Pt4', top: '50%', left: '8%' },
  { id: 'Pt5', top: '50%', left: '50%' },
  { id: 'Pt6', top: '50%', left: '92%' },
  { id: 'Pt7', top: '92%', left: '8%' },
  { id: 'Pt8', top: '92%', left: '50%' },
  { id: 'Pt9', top: '92%', left: '92%' }
];

type CalibrationOverlayProps = {
  visible: boolean;
  onComplete: () => void;
};

export const CalibrationOverlay = ({ visible, onComplete }: CalibrationOverlayProps): JSX.Element | null => {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const handlePointClick = useCallback((id: string) => {
    if (completed[id]) return;

    setClickCounts(prev => {
      const nextCount = (prev[id] ?? 0) + 1;
      const next = { ...prev, [id]: nextCount };

      if (nextCount >= CLICKS_REQUIRED) {
        setCompleted(done => {
          const updated = { ...done, [id]: true };
          if (Object.keys(updated).length === CALIBRATION_POSITIONS.length) {
            onComplete();
          }
          return updated;
        });
      }

      return next;
    });
  }, [completed, onComplete]);

  if (!visible) return null;

  const calibratedCount = Object.keys(completed).length;

  return (
    <div className="calibration-layer">
      <p className="calibration-hint">
        Click each red point {CLICKS_REQUIRED} times while looking at it ({calibratedCount}/{CALIBRATION_POSITIONS.length} done).
      </p>
      {CALIBRATION_POSITIONS.map(({ id, top, left }) => {
        const count = clickCounts[id] ?? 0;
        const isDone = completed[id];
        const opacity = isDone ? 1 : 0.25 + (count / CLICKS_REQUIRED) * 0.75;

        return (
          <button
            key={id}
            type="button"
            className={`calibration-point${isDone ? ' calibration-point--done' : ''}`}
            style={{ top, left, opacity }}
            disabled={isDone}
            onClick={() => handlePointClick(id)}
            aria-label={`Calibration point ${id}`}
          />
        );
      })}
    </div>
  );
};
