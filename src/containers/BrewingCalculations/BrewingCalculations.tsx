import React from 'react';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import { Paper, TextField, Typography, Box, Grid } from '@mui/material';
import './BrewingCalculations.css';
import {
    brixToPlato,
    platoToBrix,
    temperatureCorrection,
    correctedBrixTerrill,
    correctedBrixNovotny
} from '../../utils/Calculations/calculationsUtils';
import { eSugarTypes } from '../../enums/eSugerTypes';


const ML_TO_L_CONVERSION = 1000; // Umrechnung von Milliliter zu Liter
const SUCROSE_YIELD_FACTOR = 0.512; // g CO₂ pro g Haushaltszucker
const GLUCOSE_YIELD_FACTOR = 0.443; // g CO₂ pro g Traubenzucker
const DEFAULT_REST_CO2 = 1.7; // Standardwert für Rest-CO₂ im Jungbier

interface BrewingCalculationsState {
    brix: string;
    plato: string;
    temp: string;
    carbTemp: string;
    carbTarget: string;
    carbLiters: string;
    waterForSolutionML: string;
    ogBrix?: string; // Stammwürze in Brix
    fgBrix?: string; // Restextrakt in Brix
}

class BrewingCalculations extends React.Component<{}, BrewingCalculationsState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            brix: '',
            plato: '',
            temp: '20',
            carbTemp: '',
            carbTarget: '',
            carbLiters: '',
            waterForSolutionML: '1000',
            ogBrix: '',
            fgBrix: '',
        };
    }

    handleBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ brix: e.target.value });
    };

    handlePlatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ plato: e.target.value });
    };

    handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ temp: e.target.value });
    };

    handleCarbTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbTemp: e.target.value });
    };
    handleCarbTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbTarget: e.target.value });
    };
    handleCarbLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbLiters: e.target.value });
    };
    handleKlarwasserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ waterForSolutionML: e.target.value });
    };
    handleOgBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ ogBrix: e.target.value });
    };
    handleFgBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ fgBrix: e.target.value });
    };

     calculateSugarAmount(
         aSugarType: eSugarTypes,
     ): number {
         const {carbTarget, carbLiters } = this.state;
         const volumeBeerL = parseFloat(carbLiters);
         const targetCO2_gL = parseFloat(carbTarget);
         const waterVolumeMl = parseFloat(this.state.waterForSolutionML);
         const volumeWaterL = waterVolumeMl / ML_TO_L_CONVERSION;
         const totalVolumeL = volumeBeerL + volumeWaterL;

         const deltaCO2 = targetCO2_gL * totalVolumeL - DEFAULT_REST_CO2 * volumeBeerL;
         if (deltaCO2 <= 0) return 0;

         const factor = aSugarType === eSugarTypes.Sucrose ? 1 / SUCROSE_YIELD_FACTOR : 1 / GLUCOSE_YIELD_FACTOR;
         const sugarGrams = deltaCO2 * factor;

         return Math.round(sugarGrams);
    }



    render() {
        const { brix, plato, temp, carbTemp, carbTarget, carbLiters, ogBrix, fgBrix } = this.state;
        const brixNum = parseFloat(brix);
        const platoNum = parseFloat(plato);
        const tempNum = parseFloat(temp);
        const sucroseSugar = this.calculateSugarAmount(eSugarTypes.Sucrose);
        const glucoseSugar = this.calculateSugarAmount(eSugarTypes.Glucose);
        const ogBrixNum = parseFloat(ogBrix || '');
        const fgBrixNum = parseFloat(fgBrix || '');
        const terrillResult =
            ogBrix !== '' && fgBrix !== '' && !isNaN(ogBrixNum) && !isNaN(fgBrixNum)
                ? correctedBrixNovotny(ogBrixNum, fgBrixNum).toFixed(2)
                : '';
        return (
            <div className="BrewingCalculations-outer">
                <SimpleBar style={{ maxHeight: '100%' }}>
                    <Paper elevation={3} style={{  margin: 24, padding: 24 }}>
                        <Typography variant="h5" gutterBottom>Bierbrau-Berechnungen</Typography>
                        <Box mb={3}>
                            <Typography variant="h6">Brix &lt;-&gt; Plato</Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Brix"
                                        value={brix}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleBrixChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <Typography align="center">→</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Plato"
                                        value={brix !== '' ? brixToPlato(brixNum).toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <Grid container spacing={2} alignItems="center" style={{ marginTop: 16 }}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Plato"
                                        value={plato}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handlePlatoChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <Typography align="center">→</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Brix"
                                        value={plato !== '' ? platoToBrix(platoNum).toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                        <Box mb={3}>
                            <Typography variant="h6">Temperaturkorrektur</Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Gemessene Temperatur (°C)"
                                        value={temp}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleTempChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Brix (korrigiert)"
                                        value={brix !== '' && temp !== '' ? temperatureCorrection(brixNum, tempNum).toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Plato (korrigiert)"
                                        value={plato !== '' && temp !== '' ? temperatureCorrection(platoNum, tempNum).toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                        <Box mb={3}>
                            <Typography variant="h6">Zucker-/Traubenzucker-Zugabe für Karbonisierung</Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        label="Jungbiertemperatur (°C)"
                                        value={carbTemp}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleCarbTempChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        label="Gewünschter CO₂-Gehalt (g/L)"
                                        value={carbTarget}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleCarbTargetChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        label="Liter insgesamt"
                                        value={carbLiters}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleCarbLitersChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        label="Water for solution (ml)"
                                        value={this.state.waterForSolutionML}
                                        onChange={e => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === '' || parseFloat(val) >= 0) this.handleKlarwasserChange(e as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        type="number"
                                        inputProps={{ min: 0, step: 100 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <Grid container spacing={2} alignItems="center" style={{ marginTop: 16 }}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" style={{color:'#90caf9',marginBottom:4}}>Haushaltszucker (Saccharose)</Typography>
                                    <TextField
                                        label="Zucker gesamt (g)"
                                        value={sucroseSugar ? sucroseSugar.toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                        style={{marginBottom:8}}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" style={{color:'#90caf9',marginBottom:4}}>Traubenzucker (Glucose/Dextrose)</Typography>
                                    <TextField
                                        label="Traubenzucker gesamt (g)"
                                        value={glucoseSugar ? glucoseSugar.toFixed(2) : ''}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                        style={{marginBottom:8}}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                        <Box mb={3}>
                            <Typography variant="h6">Scheinbarer Restextrakt (Terrill-Korrektur)</Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Stammwürze (Brix)"
                                        value={ogBrix}
                                        onChange={this.handleOgBrixChange}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Restextrakt (Brix)"
                                        value={fgBrix}
                                        onChange={this.handleFgBrixChange}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Scheinbarer Restextrakt (Brix, Terrill)"
                                        value={terrillResult}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </SimpleBar>
            </div>
        );
    }
}
export default BrewingCalculations;
