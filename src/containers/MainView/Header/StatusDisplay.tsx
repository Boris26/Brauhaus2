import React from 'react';
import './StatusDisplay.css';

interface StatusDisplayProps {
  backendStatus: string;
  messages?: string[];
}

interface StatusDisplayState {}

class StatusDisplay extends React.Component<StatusDisplayProps, StatusDisplayState> {
  render() {
    const { backendStatus, messages } = this.props;
    return (
      <div className="status-display">
        <div className="backend-status">Backend: {backendStatus}</div>
        {messages && messages.length > 0 && (
          <div className="messages">
            {messages.map((msg, idx) => (
              <div className="message" key={idx}>{msg}</div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default StatusDisplay;
