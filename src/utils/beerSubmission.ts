import { BeerDTO } from "../model/BeerDTO";

export interface BeerSubmissionResponse {
  id?: string;
  message?: string;
  beer?: Partial<BeerDTO> & { id?: string };
}

export const hasPersistedBeerId = (beer: Pick<BeerDTO, 'id'>): boolean => {
  const id = beer.id;
  return id !== undefined && id !== null && String(id).trim() !== '' && String(id).trim() !== '0';
};

export const toBeerCreatePayload = (beer: BeerDTO): Omit<BeerDTO, 'id'> => {
  const { id, ...payload } = beer;
  return payload;
};

export const resolveSubmittedBeer = (submittedBeer: BeerDTO, response: BeerSubmissionResponse): BeerDTO => {
  const responseId = response?.beer?.id ?? response?.id;
  return {
    ...submittedBeer,
    ...(response?.beer ?? {}),
    id: responseId ?? submittedBeer.id,
  } as BeerDTO;
};

export const isRequiredPositiveQuantity = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export const extractBeerErrorMessage = (error: any, fallback: string): string => {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 404 && data?.error === 'BEER_NOT_FOUND') {
    return 'Das Rezept konnte nicht aktualisiert werden, da es nicht mehr existiert.';
  }

  if (status === 400 && data?.error === 'VALIDATION_ERROR') {
    const fieldMessages = Array.isArray(data.fields)
      ? data.fields
        .map((field: any) => [field?.path, field?.message].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ')
      : '';
    return [data.message || 'Die Rezeptdaten sind ungültig.', fieldMessages].filter(Boolean).join(' ');
  }

  return error?.message ? `${fallback}: ${error.message}` : fallback;
};
