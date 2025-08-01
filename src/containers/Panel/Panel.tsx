import React, { ReactNode, createRef } from 'react';
import './Panel.css';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface PanelProps {
  title?: string;
  children: ReactNode;
  onClose?: () => void; // Optional onClose prop
}

interface PanelState {
  isDragging: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  dragStart: { x: number; y: number } | null;
  maximized: boolean;
}

class Panel extends React.Component<PanelProps, PanelState> {
  panelRef = createRef<HTMLDivElement>();

  constructor(props: PanelProps) {
    super(props);
    this.state = {
      isDragging: false,
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      dragStart: null,
      maximized: true, // Start maximized
    };
  }

  onMouseDown = (e: React.MouseEvent) => {
    this.setState({
      isDragging: true,
      dragStart: { x: e.clientX - this.state.position.x, y: e.clientY - this.state.position.y },
    });
  };

  onMouseMove = (e: MouseEvent) => {
    const { isDragging, dragStart } = this.state;
    if (isDragging && dragStart) {
      this.setState({
        position: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        },
      });
    }
  };

  onMouseUp = () => {
    this.setState({ isDragging: false, dragStart: null });
  };

  componentDidMount() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  // Resize Handler
  onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = this.state.size.width;
    const startHeight = this.state.size.height;

    const onResizeMouseMove = (moveEvent: MouseEvent) => {
      this.setState({
        size: {
          width: Math.max(200, startWidth + moveEvent.clientX - startX),
          height: Math.max(100, startHeight + moveEvent.clientY - startY),
        },
      });
    };
    const onResizeMouseUp = () => {
      window.removeEventListener('mousemove', onResizeMouseMove);
      window.removeEventListener('mouseup', onResizeMouseUp);
    };
    window.addEventListener('mousemove', onResizeMouseMove);
    window.addEventListener('mouseup', onResizeMouseUp);
  };

  handleClose = () => {
    // Wenn ein onClose-Prop existiert, aufrufen
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleMaximize = () => {
    const headerOffset = 90; // Höhe des Headers in px (ggf. anpassen)
    if (!this.state.maximized) {
      this.setState({
        maximized: true,
        position: { x: 0, y: headerOffset },
        size: { width: window.innerWidth, height: window.innerHeight - headerOffset }
      });
    } else {
      this.setState({
        maximized: false,
        position: { x: 100, y: 120 }, // Start weiter unten
        size: { width: 400, height: 300 }
      });
    }
  };

  render() {
    const { title, children } = this.props;
    const { position, size, maximized } = this.state;
    const headerOffset = 90; // Höhe des Headers in px (ggf. anpassen)
    return (
      <div
        ref={this.panelRef}
        className={"custom-panel" + (maximized ? " custom-panel-maximized" : "")}
        style={maximized
          ? { left: 0, top: headerOffset, width: '100vw', height: `calc(100vh - ${headerOffset}px)` }
          : { left: position.x, top: position.y, width: size.width, height: size.height }}
      >
        <div className="custom-panel-header" onMouseDown={this.onMouseDown}>
          <span>{title || 'Panel'}</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconButton className="custom-panel-max-btn" onClick={this.handleMaximize} title={maximized ? "Zurücksetzen" : "Maximieren"} size="large">
              {maximized ? <FullscreenExitIcon fontSize="inherit" /> : <FullscreenIcon fontSize="inherit" />}
            </IconButton>
            <IconButton className="custom-panel-close-btn" onClick={this.handleClose} title="Schließen" size="large">
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </div>
        </div>
        <div className="custom-panel-content">{children}</div>
        <div className="custom-panel-resize" onMouseDown={this.onResizeMouseDown} />
      </div>
    );
  }
}

export default Panel;
