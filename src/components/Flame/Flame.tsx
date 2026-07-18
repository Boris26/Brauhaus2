import React from 'react';
import './Flame.css';

class Flame extends React.Component {
    render() {

        return (
            <div className="flameRoot" aria-label="Heizflamme">
                <div className="flameContainer">
                    <div className="flameOuter flame-shape" />
                    <div className="flameInner flame-shape" />
                </div>
            </div>

        );
    }
}
export default Flame;
