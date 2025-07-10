import React from 'react';
import './StatusDisplay.css';

interface StatusDisplayProps {
  backendStatus: string;
  messages?: string[];
  onDeleteMessage?: (index: number) => void;
}

interface StatusDisplayState {}

class StatusDisplay extends React.Component<StatusDisplayProps, StatusDisplayState> {
  render() {
    const { backendStatus, messages, onDeleteMessage } = this.props;
    return (
      <div className="status-display">
        <div className="backend-status-row">
          <span className="backend-status">Backend: {backendStatus}</span>
          <span className="close-x" title="Alle Nachrichten löschen" onClick={() => onDeleteMessage && onDeleteMessage(-1)}>
            ×
          </span>
        </div>
        {messages && messages.length > 0 && (
          <div className="messages">
            {messages.map((msg, idx) => (
              <div className="message-row" key={idx}>
                <span className="message">{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default StatusDisplay;
