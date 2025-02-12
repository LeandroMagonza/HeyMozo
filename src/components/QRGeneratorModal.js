import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCodeDocument from './QRCodeDocument';
import './QRGeneratorModal.css';
import { FaTimes, FaUpload } from 'react-icons/fa';

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Bold' },
  { value: 'Helvetica-Oblique', label: 'Helvetica Oblique' },
  { value: 'Helvetica-BoldOblique', label: 'Helvetica Bold Oblique' },
  { value: 'Times-Roman', label: 'Times Roman' },
  { value: 'Times-Bold', label: 'Times Bold' },
  { value: 'Times-Italic', label: 'Times Italic' },
  { value: 'Times-BoldItalic', label: 'Times Bold Italic' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Courier-Bold', label: 'Courier Bold' },
  { value: 'Courier-Oblique', label: 'Courier Oblique' },
  { value: 'Courier-BoldOblique', label: 'Courier Bold Oblique' },
  { value: 'Symbol', label: 'Symbol' },
  { value: 'ZapfDingbats', label: 'ZapfDingbats' }
];

const QRGeneratorModal = ({ show, onClose, tables, companyId, branchId, branch }) => {
  const [logo, setLogo] = useState(null);
  const [background, setBackground] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [websiteText, setWebsiteText] = useState(branch.website || "");

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setLogo(reader.result);
          setLogoPreview(URL.createObjectURL(file));
        } else {
          setBackground(reader.result);
          setBackgroundPreview(URL.createObjectURL(file));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePDF = () => {
    if (logo && background) {
      setIsReady(true);
      document.querySelector('.download-link')?.click();
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="qr-generator-modal">
        <div className="modal-header">
          <h2>Generar Códigos QR</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          <div className="image-upload-section">
            <div className="upload-container">
              <label>Logo del Restaurante</label>
              <div className="upload-area">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" />
                ) : (
                  <div className="upload-placeholder">
                    <FaUpload />
                    <span>Subir Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                />
              </div>
            </div>

            <div className="upload-container">
              <label>Fondo para QR</label>
              <div className="upload-area">
                {backgroundPreview ? (
                  <img src={backgroundPreview} alt="Background preview" />
                ) : (
                  <div className="upload-placeholder">
                    <FaUpload />
                    <span>Subir Fondo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'background')}
                />
              </div>
            </div>
          </div>

          <div className="style-options">
            <div className="input-group">
              <label>Texto junto al logo</label>
              <input
                type="text"
                value={websiteText}
                onChange={(e) => setWebsiteText(e.target.value)}
                placeholder="Ingrese el texto que aparecerá junto al logo"
                className="text-input"
              />
            </div>

            <div className="style-controls">
              <div className="input-group">
                <label>Color del Texto</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="color-input"
                />
              </div>
              
              <div className="input-group">
                <label>Fuente</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="font-select"
                >
                  {FONT_OPTIONS.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!isReady ? (
            <button 
              className="generate-button"
              onClick={handleGeneratePDF}
              disabled={!logo || !background}
            >
              Generar PDF
            </button>
          ) : (
            <PDFDownloadLink
              document={
                <QRCodeDocument 
                  tables={tables} 
                  companyId={companyId} 
                  branchId={branchId}
                  branchName={branch.name}
                  restaurantLogo={logo}
                  textColor={textColor}
                  fontFamily={fontFamily}
                  qrBackgroundImage={background}
                  website={websiteText}
                />
              }
              fileName={`qr-codes-${branch.name}.pdf`}
              className="download-link"
            >
              {({ loading, error }) => (
                <span className={loading ? 'processing' : ''}>
                  {loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF'}
                </span>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGeneratorModal; 