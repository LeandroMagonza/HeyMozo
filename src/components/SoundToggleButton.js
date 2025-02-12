import React from 'react';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';

const SoundToggleButton = ({ isSoundEnabled, onClick }) => {
  return (
    <button 
      className="sound-toggle-button app-button"
      onClick={onClick}
      title={isSoundEnabled ? "Silenciar notificaciones" : "Activar notificaciones"}
    >
      {isSoundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
    </button>
  );
};

export default SoundToggleButton; 