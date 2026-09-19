import React from 'react';
import Details from './Details/Details.connect';
import BeerTable from './BeerRecipes/Table/Table.connect';
import {Beer} from '../../model/Beer';
import './Main.css';
import {PageLayout} from '../../components/PageLayout/PageLayout';

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
            <PageLayout title="Rezepte" subtitle="Rezepte im Überblick." scroll={false} contentClassName="main-view">
                <section className="CustomTable" aria-label="Rezeptliste">
                    <div className="recipe-list-scroll"><BeerTable/></div>
                </section>
                <section className="Details" aria-label="Rezeptdetails">
                    <Details/>
                </section>
            </PageLayout>
        );
    }
}
