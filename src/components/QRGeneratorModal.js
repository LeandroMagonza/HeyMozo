import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCodeDocument from './QRCodeDocument';
import './QRGeneratorModal.css';
import { FaTimes, FaUpload, FaQrcode } from 'react-icons/fa';

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
  const [logo, setLogo] = useState('');
  const [background, setBackground] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [websiteText, setWebsiteText] = useState(branch?.website || "");
  const [qrDarkColor, setQrDarkColor] = useState("#000000");
  const [qrCodeSize, setQrCodeSize] = useState(180);
  const [useWhiteBackground, setUseWhiteBackground] = useState(true);

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
    setIsReady(true);
    document.querySelector('.download-link')?.click();
  };

  const isGenerateButtonDisabled = false; // Logo y fondo son opcionales

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
              <label>Logo del Restaurante <span className="optional-text">(Opcional)</span></label>
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
              <label>Fondo para QR <span className="optional-text">(Opcional)</span></label>
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

            <div className="qr-code-options">
              <h3><FaQrcode /> Configuración avanzada del QR</h3>
              <div className="qr-option-controls">
                <div className="input-group">
                  <label>Color del QR</label>
                  <input
                    type="color"
                    value={qrDarkColor}
                    onChange={(e) => setQrDarkColor(e.target.value)}
                    className="color-input"
                    title="Color de los módulos oscuros del QR"
                  />
                </div>
                
                <div className="input-group">
                  <label>Tamaño del QR (px)</label>
                  <input
                    type="range"
                    min="150"
                    max="250"
                    value={qrCodeSize}
                    onChange={(e) => setQrCodeSize(parseInt(e.target.value))}
                    className="range-input"
                    title="Tamaño del código QR"
                  />
                  <span className="range-value">{qrCodeSize}px</span>
                </div>
                
                <div className="input-group">
                  <label>Fondo blanco para QR</label>
                  <div className="toggle-container">
                    <input
                      type="checkbox"
                      id="white-background-toggle"
                      checked={useWhiteBackground}
                      onChange={(e) => setUseWhiteBackground(e.target.checked)}
                      className="toggle-input"
                    />
                    <label htmlFor="white-background-toggle" className="toggle-label">
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <span className="toggle-text">
                    {useWhiteBackground ? "Activado" : "Desactivado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!isReady ? (
            <button 
              className="generate-button"
              onClick={handleGeneratePDF}
              disabled={isGenerateButtonDisabled}
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
                  qrDarkColor={qrDarkColor}
                  qrCodeSize={qrCodeSize}
                  useWhiteBackground={useWhiteBackground}
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