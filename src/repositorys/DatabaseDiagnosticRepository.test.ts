import {api} from './BaseRepository';
import {DatabaseDiagnosticRepository} from './DatabaseDiagnosticRepository';

jest.mock('./BaseRepository', () => {
    const get = jest.fn();
    return {
        api: {get},
        BaseRepository: class {
            protected static async get<T>(aUrl: string): Promise<T> {
                const response = await get(aUrl);
                return response.data;
            }
        },
    };
});

const mockedApi = api as unknown as { get: jest.Mock };

describe('DatabaseDiagnosticRepository', () => {
    beforeEach((): void => {
        mockedApi.get.mockReset();
    });

    it('loads database diagnostics from GET diag', async (): Promise<void> => {
        mockedApi.get.mockResolvedValueOnce({data: {version: 'v1.1.0'}});

        const result = await DatabaseDiagnosticRepository.getDiagnosticVersion();

        expect(result).toBe('v1.1.0');
        expect(mockedApi.get).toHaveBeenCalledWith('diag');
    });
});
