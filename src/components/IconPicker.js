import React, { useState, useMemo } from 'react';
import { FaTimes, FaSearch, FaTrash } from 'react-icons/fa';
import IconRenderer, { iconCategories, getAllIcons, searchIcons, getIconsByCategory } from '../services/iconRenderer';
import './IconPicker.css';

const IconPicker = ({ 
  show, 
  onClose, 
  selectedIcon, 
  onIconSelect,
  title = "Seleccionar Icono"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');

  // Get filtered icons based on search and category
  const filteredIcons = useMemo(() => {
    if (searchTerm) {
      return searchIcons(searchTerm);
    } else {
      return getIconsByCategory(selectedCategory);
    }
  }, [searchTerm, selectedCategory]);

  const handleIconSelect = (iconName) => {
    onIconSelect(iconName);
    onClose();
  };

  const handleClearIcon = () => {
    onIconSelect(null);
    onClose();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchTerm(''); // Clear search when changing category
  };

  if (!show) return null;

  return (
    <div className="icon-picker-overlay">
      <div className="icon-picker-modal">
        <div className="icon-picker-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="icon-picker-content">
          {/* Search Bar */}
          <div className="icon-search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar iconos..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="icon-search-input"
            />
          </div>

          {/* Category Tabs (only show when not searching) */}
          {!searchTerm && (
            <div className="icon-categories">
              {Object.entries(iconCategories).map(([key, category]) => (
                <button
                  key={key}
                  className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(key)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Current Selection */}
          <div className="current-selection">
            <span className="selection-label">Selección actual:</span>
            <div className="current-icon-display">
              {selectedIcon ? (
                <>
                  <IconRenderer iconName={selectedIcon} size="1.5em" />
                  <span className="icon-name">{selectedIcon}</span>
                  <button 
                    className="clear-icon-button"
                    onClick={handleClearIcon}
                    title="Quitar icono"
                  >
                    <FaTrash />
                  </button>
                </>
              ) : (
                <span className="no-icon">Sin icono</span>
              )}
            </div>
          </div>

          {/* Icons Grid */}
          <div className="icons-grid">
            {filteredIcons.length > 0 ? (
              filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  className={`icon-option ${selectedIcon === iconName ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(iconName)}
                  title={iconName}
                >
                  <IconRenderer iconName={iconName} size="1.5em" />
                  <span className="icon-label">{iconName.replace('Fa', '')}</span>
                </button>
              ))
            ) : (
              <div className="no-icons-found">
                <p>No se encontraron iconos</p>
                {searchTerm && (
                  <button 
                    className="clear-search-button"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="icon-picker-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="clear-button" 
            onClick={handleClearIcon}
          >
            <FaTrash /> Sin Icono
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconPicker;