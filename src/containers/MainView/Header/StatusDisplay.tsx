import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import './StatusDisplay.css';

interface StatusDisplayProps {
  backendStatus: boolean;
  messages?: string[];
  disableScrollAnimation?: boolean;
  removeAllMessages: () => void;
  priorityMessage?: string;
  prioritySeverity?: 'alarm' | 'warning';
}

interface StatusDisplayState {}

class StatusDisplay extends React.Component<StatusDisplayProps, StatusDisplayState> {
  messagesRef: React.RefObject<HTMLDivElement> = React.createRef();
  scrollInterval: NodeJS.Timeout | null = null;
  isPaused: boolean = false;

  componentDidMount() {
    if (!this.props.disableScrollAnimation) this.startAutoScroll();
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

  handleMouseEnter = () => { this.isPaused = true; };
  handleMouseLeave = () => { this.isPaused = false; };

  startAutoScroll = () => {
    if (this.props.disableScrollAnimation) return;
    this.scrollInterval = setInterval(() => {
      if (this.isPaused) return;
      const messagesDiv = this.messagesRef.current;
      if (!messagesDiv) return;
      if (messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight) messagesDiv.scrollTop = 0;
      else messagesDiv.scrollTop += 1;
    }, 70);
  };

  render() {
    const {backendStatus, messages, removeAllMessages, priorityMessage, prioritySeverity} = this.props;
    const backendClass = backendStatus ? 'Online' : 'Offline';
    const priorityClass = prioritySeverity === 'alarm' ? 'alarm-message' : prioritySeverity === 'warning' ? 'warning-message' : '';
    const priorityRole = prioritySeverity === 'alarm' ? 'alert' : 'status';
    const hasMessages = Boolean(priorityMessage || (messages && messages.length > 0));

    return (
      <div className="status-display">
        <div className={`status-chip backend-chip ${backendClass}`} title={`Backend ${backendClass}`}>
          {backendStatus ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          <span>Backend: {backendClass}</span>
        </div>
        {priorityMessage ? (
          <div className={`status-chip message-chip ${priorityClass}`} role={priorityRole} title={priorityMessage}>
            <WarningAmberIcon />
            <span className="message">{priorityMessage}</span>
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="status-chip message-chip messages" ref={this.messagesRef} title={messages[0]}>
            <span className="message">{messages[0]}</span>
          </div>
        ) : null}
        {hasMessages && (
          <button className="status-clear-button" type="button" title="Alle Nachrichten löschen" aria-label="Alle Nachrichten löschen" onClick={removeAllMessages}>
            <CloseIcon />
          </button>
        )}
      </div>
    );
  }
}

export default StatusDisplay;
