import React from 'react';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {TimeAnchorState} from '../../../utils/brewingStatus/streams';
import {useProcessDisplayTime} from '../../../utils/brewingStatus/useProcessDisplayTime';
import {TimeFormatter} from '../../../utils/TimeFormatter';

export const ProcessElapsedTime = ({status, anchor, stale}: {status?: BrewingStatus; anchor?: TimeAnchorState; stale?: boolean}) => {
  const time = useProcessDisplayTime(status, anchor, stale);
  return <>{time.processElapsedSeconds === undefined ? '-' : TimeFormatter.formatSecondsToHMS(time.processElapsedSeconds)}</>;
};
