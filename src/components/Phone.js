import React from 'react';
import './Phone.css';

const Phone = ({ children, className = '' }) => {
  return (
    <div className={`phone-frame ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Phone;
