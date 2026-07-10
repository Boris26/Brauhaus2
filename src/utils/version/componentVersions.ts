import {DatabaseDiagnosticRepository} from '../../repositorys/DatabaseDiagnosticRepository';
import {ProductionRepository} from '../../repositorys/ProductionRepository';

export interface IComponentVersions {
    control: string;
    database: string;
}

export class ComponentVersionService {
    static async getControlVersion(): Promise<string> {
        return await ProductionRepository.getDiagnosticVersion();
    }

    static async getDatabaseVersion(): Promise<string> {
        return await DatabaseDiagnosticRepository.getDiagnosticVersion();
    }
}
