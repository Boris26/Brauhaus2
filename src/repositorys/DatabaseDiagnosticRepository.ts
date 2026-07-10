import {IDiagnosticResponse, normalizeDiagnosticVersion} from '../model/DiagnosticResponse';
import {BaseRepository} from './BaseRepository';

export class DatabaseDiagnosticRepository extends BaseRepository {
    static async getDiagnosticVersion(): Promise<string> {
        const response = await this.get<IDiagnosticResponse>('diag');
        return normalizeDiagnosticVersion(response);
    }
}
