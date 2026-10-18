import React, {useEffect} from 'react';
import {ProcessList} from './ProcessList';
import {TimeAnchorState} from '../../../utils/brewingStatus/streams';
import {useProcessDisplayTime} from '../../../utils/brewingStatus/useProcessDisplayTime';

type Props = React.ComponentProps<typeof ProcessList> & {timeAnchor?: TimeAnchorState; stale?: boolean; onElapsed?: (elapsed?: number) => void};

/** Only this process panel ticks; water controls and gauges do not rerender each second. */
export const TimedProcessList = ({timeAnchor, stale, onElapsed, ...props}: Props) => {
  const time = useProcessDisplayTime(props.brewingStatus, timeAnchor, stale);
  useEffect(() => {onElapsed?.(time.stepElapsedSeconds);}, [onElapsed, time.stepElapsedSeconds]);
  return <ProcessList {...props} remainingSeconds={time.remainingSeconds} />;
};
