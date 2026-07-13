import {ApplicationActions} from '../actions/actions';
import {applicationReducer, initialApplicationState, MAX_APPLICATION_MESSAGES} from './applicationReducer';

describe('applicationReducer messages', (): void => {
  it('keeps only the newest configured number of messages', (): void => {
    let aState = initialApplicationState;

    for (let aIndex = 0; aIndex < MAX_APPLICATION_MESSAGES + 5; aIndex += 1) {
      aState = applicationReducer(aState, ApplicationActions.setMessage(`message-${aIndex}`));
    }

    expect(aState.message).toHaveLength(MAX_APPLICATION_MESSAGES);
    expect(aState.message?.[0]).toBe('message-5');
    expect(aState.message?.at(-1)).toBe(`message-${MAX_APPLICATION_MESSAGES + 4}`);
  });

  it('deduplicates directly repeated messages and still clears all messages', (): void => {
    let aState = applicationReducer(initialApplicationState, ApplicationActions.setMessage('same'));
    aState = applicationReducer(aState, ApplicationActions.setMessage('same'));

    expect(aState.message).toEqual(['same']);

    aState = applicationReducer(aState, ApplicationActions.removeMessage());

    expect(aState.message).toEqual([]);
  });
});
