import React, { Component } from 'react';
import {FinishedBrew} from "../../../model/FinishedBrew";
interface FinishedBrewDetailsProps {
  brew: FinishedBrew;
}

class FinishedBrewDetails extends Component<FinishedBrewDetailsProps> {
  render() {
    const { brew } = this.props;
    if (!brew) return <div>Keine Daten verfügbar.</div>;

    return (
      <div className="finished-brew-details">
        <h3>Brau-Durchgang Details</h3>
        <table>
          <tbody>
            <tr>
              <td><b>ID:</b></td>
              <td>{brew.id}</td>
            </tr>
            <tr>
              <td><b>Name:</b></td>
              <td>{brew.name}</td>
            </tr>
            <tr>
              <td><b>Notiz:</b></td>
              <td>{brew.note || '-'}</td>
            </tr>
            <tr>
              <td><b>Restextrakt:</b></td>
              <td>{brew.residual_extract ?? '-'}</td>
            </tr>
            {/* Weitere Felder nach Bedarf ergänzen */}
          </tbody>
        </table>
      </div>
    );
  }
}

export default FinishedBrewDetails;
