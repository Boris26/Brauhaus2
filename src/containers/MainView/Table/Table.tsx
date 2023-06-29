import React from 'react';
import {Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TableSortLabel, Paper} from '@mui/material';
import './Table.css';
import {Beer} from "../../../model/Beer";
import {connect} from "react-redux";
import {BeerActions} from "../../../actions/actions";
import setSelectedBeer = BeerActions.setSelectedBeer;

export interface BeerTableProps {
    beers: Beer[];
    setSelectedBeer: (beer: Beer) => void;
}




interface BeerTableState {
    sortConfig: SortConfig;
    selectedBeerId: number | null;
}


interface SortConfig {
    key: keyof Beer;
    direction: 'asc' | 'desc';
}

export class BeerTableComponent extends React.Component<BeerTableProps,BeerTableState > {
    constructor(props: BeerTableProps) {
        super(props);

        this.state = {
            sortConfig: { key: 'name', direction: 'asc' },selectedBeerId:null
        };
    }

    componentDidMount() {
        const { beers } = this.props;
        if (beers.length > 0) {
            const firstBeer = beers[0];
            this.props.setSelectedBeer(firstBeer);
            this.setState({ selectedBeerId: firstBeer.id });
        }
    }

    onSort = (key: keyof Beer) => {
        const { sortConfig } = this.state;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        this.setState({ sortConfig: { key, direction } });
    };
    onSele(aBeer: Beer)
    {
        const { setSelectedBeer } = this.props;
        setSelectedBeer(aBeer);
        this.setState({selectedBeerId:aBeer.id});
    }

    render() {
        const { beers } = this.props;
        const { sortConfig,selectedBeerId } = this.state;

        const sortedData = [...beers].sort((a, b) => {
            const { key, direction } = sortConfig;
            if (a[key] < b[key]) {
                return direction === 'asc' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return (
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((item, index) => (
                            <TableRow key={item.id}  onClick={()=>this.onSele(item)}
                                      className={`table-row ${item.id === selectedBeerId ? 'selected' : ''}`}
                            >
                                <TableCell className="table-cell">{item.name}</TableCell>
                                <TableCell className="table-cell">{item.type}</TableCell>
                                <TableCell className="table-cell">{item.color}</TableCell>
                                <TableCell className="table-cell">{item.alcohol}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }
}


const mapDispatchToProps = (dispatch: any) => ({
    setSelectedBeer: (beer:Beer) => dispatch({type: 'SET_SELECTED_BEER', payload: beer})
});

export default connect(null, mapDispatchToProps)(BeerTableComponent);

