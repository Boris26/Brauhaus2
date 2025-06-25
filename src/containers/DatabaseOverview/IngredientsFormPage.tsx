import React, { useState, useEffect } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import './BeerForm.css';
import { connect } from 'react-redux';
import { BeerActions } from '../../actions/actions';
import { Malts } from '../../model/Malt';
import { Hops } from '../../model/Hops';
import { Yeasts } from '../../model/Yeasts';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import '../MainView/FinishBrewsBeers/FinishedBrewsTable.css';
import './IngredientsFormPage.css';

interface IngredientsFormPageProps {
    malts: Malts[];
    hops: Hops[];
    yeasts: Yeasts[];
    getMalt: (isFetching: boolean) => void;
    getHop: (isFetching: boolean) => void;
    getYeast: (isFetching: boolean) => void;
    submitNewMalt: (malt: Malts) => void;
    submitNewHop: (hop: Hops) => void;
    submitNewYeast: (yeast: Yeasts) => void;
}

/**
 * Komponente zur Erstellung und Verwaltung von Zutaten für Bier (Malz, Hopfen, Hefe)
 */
const IngredientsFormPage: React.FC<IngredientsFormPageProps> = ({
    malts = [],
    hops = [],
    yeasts = [],
    getMalt,
    getHop,
    getYeast,
    submitNewMalt,
    submitNewHop,
    submitNewYeast
}) => {
    const [newMalt, setNewMalt] = useState<Partial<Malts>>({});
    const [newHop, setNewHop] = useState<Partial<Hops>>({});
    const [newYeast, setNewYeast] = useState<Partial<Yeasts>>({});
    const [showNewMaltRow, setShowNewMaltRow] = useState(false);
    const [showNewHopRow, setShowNewHopRow] = useState(false);
    const [showNewYeastRow, setShowNewYeastRow] = useState(false);

    useEffect(() => {
        getMalt(true);
        getHop(true);
        getYeast(true);
    }, [getMalt, getHop, getYeast]);

    const handleAddMalt = () => {
        if (newMalt.name && newMalt.ebc) {
            submitNewMalt(newMalt as Malts);
            setNewMalt({});
            setShowNewMaltRow(false);
        }
    };

    const handleAddHop = () => {
        if (newHop.name && newHop.alpha) {
            // Stellen Sie sicher, dass alle erforderlichen Felder vorhanden sind
            const hopToSubmit: Hops = {
                id: 0, // ID wird vom Server generiert
                name: newHop.name || '',
                type: newHop.type || '',
                alpha: String(newHop.alpha), // Umwandlung in String, da das Interface einen String erwartet
                description: newHop.description || ''
            };
            submitNewHop(hopToSubmit);
            setNewHop({});
            setShowNewHopRow(false);
        }
    };

    const handleAddYeast = () => {
        if (newYeast.name) {
            // Stellen Sie sicher, dass alle erforderlichen Felder vorhanden sind
            const yeastToSubmit: Yeasts = {
                id: 0, // ID wird vom Server generiert
                name: newYeast.name || '',
                type: newYeast.type || '',
                temperature: String(newYeast.temperature || ''), // Umwandlung in String
                evg: String(newYeast.evg || ''), // Verwenden Sie evg statt fermentation_level
                description: newYeast.description || ''
            };
            submitNewYeast(yeastToSubmit);
            setNewYeast({});
            setShowNewYeastRow(false);
        }
    };

    return (
        <div className='containerIngredientsForm'>
            <Accordion defaultExpanded sx={{backgroundColor: '#404040'}}>
                <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '10px 10px 0 0' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                    <Typography>Malz</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    <div>
                        <div className="filter-container">
                            <button
                                className="finish-btn"
                                onClick={() => setShowNewMaltRow(true)}
                                title="Neuen Malz hinzufügen"
                            >
                                <span role="img" aria-label="Plus" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>➕</span>
                            </button>
                        </div>

                        <SimpleBar style={{ maxHeight: 400 }}>
                            <TableContainer component={Paper} className="FinishedBrewsTable">
                                <Table>
                                    <TableHead className="table-header">
                                        <TableRow>
                                            <TableCell className="table-header-cell">Name</TableCell>
                                            <TableCell className="table-header-cell">Beschreibung</TableCell>
                                            <TableCell className="table-header-cell">EBC</TableCell>
                                            <TableCell className="table-header-cell">Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {showNewMaltRow && (
                                            <TableRow className="table-row">
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newMalt.name || ''}
                                                        onChange={(e) => setNewMalt({...newMalt, name: e.target.value})}
                                                        placeholder="Name"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newMalt.description || ''}
                                                        onChange={(e) => setNewMalt({...newMalt, description: e.target.value})}
                                                        placeholder="Beschreibung"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="number"
                                                        className="table-edit-field"
                                                        value={newMalt.ebc || ''}
                                                        onChange={(e) => setNewMalt({...newMalt, ebc: Number(e.target.value)})}
                                                        placeholder="EBC"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="finish-btn"
                                                            onClick={handleAddMalt}
                                                            title="Speichern"
                                                        >
                                                            <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>💾</span>
                                                        </button>
                                                        <button
                                                            className="cancel-btn"
                                                            onClick={() => setShowNewMaltRow(false)}
                                                            title="Abbrechen"
                                                        >
                                                            <span role="img" aria-label="Abbrechen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>✖️</span>
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {malts.map((malt) => (
                                            <TableRow key={malt.id} className="table-row">
                                                <TableCell className="table-cell">{malt.name}</TableCell>
                                                <TableCell className="table-cell">{malt.description}</TableCell>
                                                <TableCell className="table-cell">{malt.ebc}</TableCell>
                                                <TableCell className="table-cell">
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </SimpleBar>
                    </div>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                    <Typography>Hopfen</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    <div>
                        <div className="filter-container">
                            <button
                                className="finish-btn"
                                onClick={() => setShowNewHopRow(true)}
                                title="Neuen Hopfen hinzufügen"
                            >
                                <span role="img" aria-label="Plus" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>➕</span>
                            </button>
                        </div>

                        <SimpleBar style={{ maxHeight: 400 }}>
                            <TableContainer component={Paper} className="FinishedBrewsTable">
                                <Table>
                                    <TableHead className="table-header">
                                        <TableRow>
                                            <TableCell className="table-header-cell">Name</TableCell>
                                            <TableCell className="table-header-cell">Alpha (%)</TableCell>
                                            <TableCell className="table-header-cell">Typ</TableCell>
                                            <TableCell className="table-header-cell">Herkunft</TableCell>
                                            <TableCell className="table-header-cell">Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {showNewHopRow && (
                                            <TableRow className="table-row">
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newHop.name || ''}
                                                        onChange={(e) => setNewHop({...newHop, name: e.target.value})}
                                                        placeholder="Name"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newHop.alpha || ''}
                                                        onChange={(e) => setNewHop({...newHop, alpha: e.target.value})}
                                                        placeholder="Alpha"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newHop.type || ''}
                                                        onChange={(e) => setNewHop({...newHop, type: e.target.value})}
                                                        placeholder="Typ"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newHop.description || ''}
                                                        onChange={(e) => setNewHop({...newHop, description: e.target.value})}
                                                        placeholder="Herkunft/Beschreibung"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="finish-btn"
                                                            onClick={handleAddHop}
                                                            title="Speichern"
                                                        >
                                                            <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>💾</span>
                                                        </button>
                                                        <button
                                                            className="cancel-btn"
                                                            onClick={() => setShowNewHopRow(false)}
                                                            title="Abbrechen"
                                                        >
                                                            <span role="img" aria-label="Abbrechen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>✖️</span>
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {hops.map((hop) => (
                                            <TableRow key={hop.id} className="table-row">
                                                <TableCell className="table-cell">{hop.name}</TableCell>
                                                <TableCell className="table-cell">{hop.alpha}</TableCell>
                                                <TableCell className="table-cell">{hop.type}</TableCell>
                                                <TableCell className="table-cell">{hop.description}</TableCell>
                                                <TableCell className="table-cell">
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </SimpleBar>
                    </div>
                </AccordionDetails>
            </Accordion>

            <Accordion sx={{backgroundColor: '#404040'}}>
                <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '0px 0px 10px 10px' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel3a-content" id="panel3a-header">
                    <Typography>Hefe</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    <div>
                        <div className="filter-container">
                            <button
                                className="finish-btn"
                                onClick={() => setShowNewYeastRow(true)}
                                title="Neue Hefe hinzufügen"
                            >
                                <span role="img" aria-label="Plus" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>➕</span>
                            </button>
                        </div>

                        <SimpleBar style={{ maxHeight: 400 }}>
                            <TableContainer component={Paper} className="FinishedBrewsTable">
                                <Table>
                                    <TableHead className="table-header">
                                        <TableRow>
                                            <TableCell className="table-header-cell">Name</TableCell>
                                            <TableCell className="table-header-cell">Typ</TableCell>
                                            <TableCell className="table-header-cell">Temperatur (°C)</TableCell>
                                            <TableCell className="table-header-cell">Vergärungsgrad (%)</TableCell>
                                            <TableCell className="table-header-cell">Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {showNewYeastRow && (
                                            <TableRow className="table-row">
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newYeast.name || ''}
                                                        onChange={(e) => setNewYeast({...newYeast, name: e.target.value})}
                                                        placeholder="Name"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newYeast.type || ''}
                                                        onChange={(e) => setNewYeast({...newYeast, type: e.target.value})}
                                                        placeholder="Typ"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newYeast.temperature || ''}
                                                        onChange={(e) => setNewYeast({...newYeast, temperature: e.target.value})}
                                                        placeholder="Temperatur"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <input
                                                        type="text"
                                                        className="table-edit-field"
                                                        value={newYeast.evg || ''}
                                                        onChange={(e) => setNewYeast({...newYeast, evg: e.target.value})}
                                                        placeholder="Vergärungsgrad"
                                                    />
                                                </TableCell>
                                                <TableCell className="table-cell">
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="finish-btn"
                                                            onClick={handleAddYeast}
                                                            title="Speichern"
                                                        >
                                                            <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>💾</span>
                                                        </button>
                                                        <button
                                                            className="cancel-btn"
                                                            onClick={() => setShowNewYeastRow(false)}
                                                            title="Abbrechen"
                                                        >
                                                            <span role="img" aria-label="Abbrechen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>✖️</span>
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {yeasts.map((yeast) => (
                                            <TableRow key={yeast.id} className="table-row">
                                                <TableCell className="table-cell">{yeast.name}</TableCell>
                                                <TableCell className="table-cell">{yeast.type}</TableCell>
                                                <TableCell className="table-cell">{yeast.temperature}</TableCell>
                                                <TableCell className="table-cell">{yeast.evg}</TableCell>
                                                <TableCell className="table-cell">
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </SimpleBar>
                    </div>
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

const mapStateToProps = (state: any) => ({
    malts: state.beerDataReducer.malts || [],
    hops: state.beerDataReducer.hops || [],
    yeasts: state.beerDataReducer.yeasts || []
});

const mapDispatchToProps = (dispatch: any) => ({
    getMalt: (isFetching: boolean) => dispatch(BeerActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(BeerActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(BeerActions.getYeasts(isFetching)),
    submitNewMalt: (malt: Malts) => dispatch(BeerActions.submitNewMalt(malt)),
    submitNewHop: (hop: Hops) => dispatch(BeerActions.submitNewHop(hop)),
    submitNewYeast: (yeast: Yeasts) => dispatch(BeerActions.submitNewYeast(yeast))
});

export default connect(mapStateToProps, mapDispatchToProps)(IngredientsFormPage);
