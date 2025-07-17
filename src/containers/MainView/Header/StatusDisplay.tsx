import React from 'react';
import './StatusDisplay.css';

interface StatusDisplayProps {
  backendStatus: string;
  messages?: string[];
  disableScrollAnimation?: boolean;
  removeAllMessages: () => void;
}

interface StatusDisplayState {}

class StatusDisplay extends React.Component<StatusDisplayProps, StatusDisplayState> {
  messagesRef: React.RefObject<HTMLDivElement> = React.createRef();
  scrollInterval: NodeJS.Timeout | null = null;
  isPaused: boolean = false;

  componentDidMount() {
    if (!this.props.disableScrollAnimation) {
      this.startAutoScroll();
    }
    const messagesDiv = this.messagesRef.current;
    if (messagesDiv) {
      messagesDiv.addEventListener('mouseenter', this.handleMouseEnter);
      messagesDiv.addEventListener('mouseleave', this.handleMouseLeave);
    }
  }

  componentWillUnmount() {
    if (this.scrollInterval) clearInterval(this.scrollInterval);
    const messagesDiv = this.messagesRef.current;
    if (messagesDiv) {
      messagesDiv.removeEventListener('mouseenter', this.handleMouseEnter);
      messagesDiv.removeEventListener('mouseleave', this.handleMouseLeave);
    }
  }

  handleMouseEnter = () => {
    this.isPaused = true;
  };

  handleMouseLeave = () => {
    this.isPaused = false;
  };

  startAutoScroll = () => {
    if (this.props.disableScrollAnimation) return;
    const scrollStep = 1; // px pro Schritt
    const scrollDelay = 70; // ms pro Schritt
    this.scrollInterval = setInterval(() => {
      if (this.isPaused) return;
      const messagesDiv = this.messagesRef.current;
      if (messagesDiv) {
        if (messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight) {
          messagesDiv.scrollTop = 0;
        } else {
          messagesDiv.scrollTop += scrollStep;
        }
      }
    }, scrollDelay);
  };

  render() {
    const { backendStatus, messages, removeAllMessages } = this.props;
    const backendClass = backendStatus === 'Online' ? 'online' : backendStatus === 'Offline' ? 'offline' : '';
    return (
      <div className="status-display">
        <div className="backend-status-row">
          <span className={`backend-status ${backendClass}`}>Backend: {backendStatus}</span>
          <span className="close-x" title="Alle Nachrichten löschen" onClick={() => removeAllMessages()}>
            ×
          </span>
        </div>
        {messages && messages.length > 0 && (
          <div className="messages" ref={this.messagesRef}>
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
