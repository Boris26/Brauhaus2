import {useEffect, useRef, useState} from 'react';
import {BrewingStatus} from '../../model/brewingStatus.types';
import {TimeAnchorState} from './streams';
import {ProcessTimeProjection} from './ProcessTimeProjection';
import {shouldCountdownLocally} from '../../containers/Production/utils/productionCountdown';

export const useProcessDisplayTime = (status?: BrewingStatus, anchor?: TimeAnchorState, stale = false) => {
  const projection = useRef(new ProcessTimeProjection());
  const [time, setTime] = useState(() => projection.current.project(status));
  useEffect(() => {
    projection.current.synchronize(status, anchor);
    const update = () => {
      if (!stale) {
        const next = projection.current.project(status);
        setTime(previous => previous.remainingSeconds === next.remainingSeconds && previous.stepElapsedSeconds === next.stepElapsedSeconds
          && previous.processElapsedSeconds === next.processElapsedSeconds ? previous : next);
      }
    };
    update();
    if (stale || (!anchor?.running && !shouldCountdownLocally(status))) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [status, anchor, stale]);
  return time;
};
