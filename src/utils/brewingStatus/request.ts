import {Observable} from 'rxjs';
import {ProductionRepository} from '../../repositorys/ProductionRepository';

/** Unsubscription really aborts HTTP; a reconnect cannot accumulate abandoned requests. */
export const requestBrewingStatus$ = (timeout = 8000) => new Observable<Awaited<ReturnType<typeof ProductionRepository.getBrewingStatus>>>(observer => {
  const controller = new AbortController();
  ProductionRepository.getBrewingStatus(timeout, controller.signal).then(
    value => {observer.next(value); observer.complete();},
    error => observer.error(error),
  );
  return () => controller.abort();
});
