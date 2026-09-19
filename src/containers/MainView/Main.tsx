import React from 'react';
import Details from './Details/Details.connect';
import BeerTable from './BeerRecipes/Table/Table.connect';
import {Beer} from '../../model/Beer';
import './Main.css';

interface MainProps {
    beers: Beer[];
    getBeers: (isFetching: boolean) => void;
}

export class Main extends React.Component<MainProps> {
    componentDidMount() {
        this.props.getBeers(true);
    }

    render() {
        return (
            <div className="main-view">
                <section className="CustomTable" aria-labelledby="recipe-list-title">
                    <header className="recipe-list-header">
                        <h1 id="recipe-list-title">Rezepte</h1>
                        <p>Alle Rezepte im Überblick</p>
                    </header>
                    <div className="recipe-list-scroll"><BeerTable/></div>
                </section>
                <section className="Details" aria-label="Rezeptdetails">
                    <Details/>
                </section>
            </div>
        );
    }
}
