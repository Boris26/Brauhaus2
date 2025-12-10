import React from 'react';
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel} from '@mui/material';
import './Table.css';
import {Beer} from "../../../model/Beer";
import {connect} from "react-redux";
import {BeerActions} from "../../../actions/actions";
import {WaterHeatingTimeCalculator, cookingTimeOptions} from "../../../utils/WaterHeatingTimeCalculator";
import {MashingType} from "../../../enums/eMashingType";
import setSelectedBeer = BeerActions.setSelectedBeer;

export interface BeerTableProps {
    beers: Beer[];
    setSelectedBeer: (beer: Beer) => void;
    setBeerToBrew: (beer: Beer | undefined) => void;
    beerToBrew?: Beer;
    isPollingRunning?: boolean;
    exportShoppingListPdf: (beer: Beer) => void;
    selectedBeer: Beer;
}


interface BeerTableState {
    sortConfig: SortConfig;
    selectedBeerId: string | null;
}


interface SortConfig {
    key: keyof Beer;
    direction: 'asc' | 'desc';
}

export class BeerTableComponent extends React.Component<BeerTableProps, BeerTableState> {
    constructor(props: BeerTableProps) {
        super(props);

        this.state = {
            sortConfig: {key: 'name', direction: 'asc'}, selectedBeerId: null
        };
    }



    componentDidUpdate(prevProps: Readonly<BeerTableProps>) {
        const {selectedBeer} = this.props;

        if (selectedBeer?.id !== prevProps.selectedBeer?.id) {
            this.setState({ selectedBeerId: selectedBeer ? selectedBeer.id : null });
        }
    }


    onSort = (key: keyof Beer) => {
        const {sortConfig} = this.state;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        this.setState({sortConfig: {key, direction}});
    };
    onSelectBeer = (aBeer: Beer) => {
        const b = new WaterHeatingTimeCalculator();
        const opt: cookingTimeOptions = {
            currentTemperature: 20,
            targetTemperature: 60,
            liters: 30,
            type: MashingType.IN,
            malzIn_g: 10000
        }
        b.setOptions(opt);
        b.getTime();
        const {setSelectedBeer} = this.props;
        setSelectedBeer(aBeer);
        this.setState({selectedBeerId: aBeer.id});
    }

    onBrewBeer = (beer: Beer) => {
        const {setBeerToBrew} = this.props;
        setBeerToBrew(beer);
    }

    onCancelBrew = () => {
        const {setBeerToBrew} = this.props;
        setBeerToBrew(undefined);
    }

    handleExportShoppingListPdfForBeer = (aBeer: Beer) => {
        const {selectedBeer} = this.props
        if(selectedBeer.id === aBeer.id)
        {
            this.props.exportShoppingListPdf(selectedBeer);
        }


    };

    render() {
        const {beers, beerToBrew, isPollingRunning} = this.props;
        const {sortConfig, selectedBeerId} = this.state;
        if (beers.length > 0) {
            const sortedData = [...beers].sort((a, b) => {
                const {key, direction} = sortConfig;
                if (a[key] < b[key]) {
                    return direction === 'asc' ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });

            return (
                <>

                    <TableContainer component={Paper} className="Table">
                        <Table className="Table">
                            <TableHead className="table-header">
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortConfig.key === 'name'}
                                            direction={sortConfig.direction}
                                            onClick={() => this.onSort('name')}
                                            className="table-header-cell"
                                        >
                                            Name
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortConfig.key === 'type'}
                                            direction={sortConfig.direction}
                                            onClick={() => this.onSort('type')}
                                            className="table-header-cell"
                                        >
                                            Sorte
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortConfig.key === 'color'}
                                            direction={sortConfig.direction}
                                            onClick={() => this.onSort('color')}
                                            className="table-header-cell"
                                        >
                                            Farbe
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortConfig.key === 'alcohol'}
                                            direction={sortConfig.direction}
                                            onClick={() => this.onSort('alcohol')}
                                            className="table-header-cell"
                                        >
                                            Alkohol
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell className="table-header-cell">
                                        Aktion
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedData.map((item, index) => (
                                    <TableRow key={item.id} onClick={() => this.onSelectBeer(item)}
                                              className={`table-row ${selectedBeerId !== null && item.id === selectedBeerId ? 'selected' : ''}`}
                                    >
                                        <TableCell className="table-cell">{item.name}</TableCell>
                                        <TableCell className="table-cell">{item.type}</TableCell>
                                        <TableCell className="table-cell">{item.color}</TableCell>
                                        <TableCell className="table-cell">{item.alcohol}</TableCell>
                                        <TableCell className="table-cell">
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button

                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        this.handleExportShoppingListPdfForBeer(item);
                                                    }}
                                                    title="Einkaufsliste"
                                                >
                                                    <span role="img" aria-label="Einkaufsliste" style={{fontSize: '1.5rem'}}>🛒</span>
                                                </button>
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        if (beerToBrew && beerToBrew.id === item.id) {
                                                            if (!this.props.isPollingRunning) {
                                                                this.onCancelBrew();
                                                            }
                                                        } else {
                                                            this.onBrewBeer(item);
                                                        }
                                                    }}
                                                    disabled={
                                                        (!!beerToBrew && beerToBrew.id !== item.id) ||
                                                        (beerToBrew && beerToBrew.id === item.id && isPollingRunning)
                                                    }
                                                    title={beerToBrew && beerToBrew.id === item.id ? 'Abbrechen' : 'Brauen'}
                                                >
                                                    <span role="img" aria-label={beerToBrew && beerToBrew.id === item.id ? 'Abbrechen' : 'Brauen'} style={{fontSize: '1.5rem'}}>
                                                        {beerToBrew && beerToBrew.id === item.id ? '✖️' : '🍺'}
                                                    </span>
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            );
        }
        return <div className="Table">No data</div>;
    }
}


const mapStateToProps = (state: any) => ({
    beerToBrew: state.beerDataReducer.beerToBrew,
    isPollingRunning: state.productionReducer.isPollingRunning,
    beers: state.beerDataReducer.beers ?? [],
    selectedBeer: state.beerDataReducer.selectedBeer
});

const mapDispatchToProps = (dispatch: any) => ({
    setSelectedBeer: (beer: Beer) => dispatch(setSelectedBeer(beer)),
    setBeerToBrew: (beer: Beer | undefined ) => dispatch(BeerActions.setBeerToBrew(beer)),
    exportShoppingListPdf: (beer: Beer) => dispatch(BeerActions.generateShoppingListPdf(beer)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BeerTableComponent);
