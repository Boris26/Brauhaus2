import {useLayoutEffect, useRef, useState} from 'react';
import {BrewingStatus} from '../../model/brewingStatus.types';
import {TimeAnchorState} from './streams';
import {ProcessTimeProjection} from './ProcessTimeProjection';
import {shouldCountdownLocally} from '../../containers/Production/utils/productionCountdown';

export const useProcessDisplayTime = (status?: BrewingStatus, anchor?: TimeAnchorState, stale = false) => {
  const projection = useRef(new ProcessTimeProjection());
  const [time, setTime] = useState(() => {
    projection.current.synchronize(status, anchor);
    return projection.current.project(status);
  });
  useLayoutEffect(() => {
    projection.current.synchronize(status, anchor);
    const update = () => {
      if (!stale) {
        const next = projection.current.project(status);
        setTime(previous => previous.remainingSeconds === next.remainingSeconds && previous.stepElapsedSeconds === next.stepElapsedSeconds
          && previous.processElapsedSeconds === next.processElapsedSeconds ? previous : next);
      }
    };
    update();
    const running = anchor ? anchor.running || anchor.processRunning || anchor.stepRunning : status?.timeline?.running ?? shouldCountdownLocally(status);
    if (stale || !running) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [status, anchor, stale]);
  return time;
};
