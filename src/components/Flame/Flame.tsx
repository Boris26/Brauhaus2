import React from 'react';
import './Flame.css';

class Flame extends React.Component {
    render() {

        return (
            <div className="flameRoot" aria-label="Heizflamme">
                <div className="flameContainer">
                    <div className="outer flame">
                        <div className="inner flame">
                        </div>
                    </div>
                </div>
            </div>

        );
    }
}
export default Flame;
