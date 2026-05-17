import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createBranch, createTable } from '../services/api';
import './BranchCreate.css';
import { FaArrowLeft, FaArrowRight, FaStore, FaCheck } from 'react-icons/fa';
import AdminHeader from './AdminHeader';
import '../styles/common.css';

const STEPS = ['Datos básicos', 'Modalidad', 'Mesas iniciales'];

const BranchCreate = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    logo: '',
    menu: '',
    modality: 'mozo',
  });
  const [tableCount, setTableCount] = useState(3);
  const [tableNames, setTableNames] = useState(['Mesa 1', 'Mesa 2', 'Mesa 3']);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'name') setNameError('');
  };

  const handleTableCountChange = (e) => {
    const count = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
    setTableCount(count);
    setTableNames(prev => {
      const updated = [...prev];
      if (count > updated.length) {
        for (let i = updated.length; i < count; i++) {
          updated.push(`Mesa ${i + 1}`);
        }
      } else {
        updated.length = count;
      }
      return updated;
    });
  };

  const handleTableNameChange = (index, value) => {
    setTableNames(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setNameError('El nombre de la sucursal es obligatorio');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const branchResponse = await createBranch({
        name: formData.name.trim(),
        website: formData.website.trim() || null,
        logo: formData.logo.trim() || null,
        menu: formData.menu.trim() || null,
        modality: formData.modality,
        companyId: parseInt(companyId),
        tableIds: [],
      });

      const newBranch = branchResponse.data;

      for (const tableName of tableNames) {
        await createTable({
          tableName: tableName.trim() || 'Mesa',
          branchId: newBranch.id,
          tableDescription: '',
        });
      }

      navigate(`/admin/${companyId}/${newBranch.id}/config`);
    } catch (error) {
      console.error('🏪 Error creando sucursal:', error);
      alert('Error al crear la sucursal. Por favor, intenta nuevamente.');
      setSaving(false);
    }
  };

  return (
    <div className="admin-container">
      <AdminHeader
        title="Nueva Sucursal"
        showBackButton={true}
        backUrl={`/admin/${companyId}/config`}
      />
      <div className="admin-content">
        <div className="branch-create">

          {/* Stepper */}
          <div className="wizard-stepper">
            {STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isCompleted = stepNum < step;
              const isActive = stepNum === step;
              return (
                <React.Fragment key={stepNum}>
                  <div className={`wizard-step-indicator${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}>
                    <div className="wizard-step-circle">
                      {isCompleted ? <FaCheck /> : stepNum}
                    </div>
                    <span className="wizard-step-label">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="wizard-step-connector" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step content */}
          <div className="wizard-body">

            {step === 1 && (
              <div className="wizard-step-content">
                <div className="input-group">
                  <label>Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Ej: Sede Centro"
                    disabled={saving}
                    autoFocus
                  />
                  {nameError && <span className="field-error">{nameError}</span>}
                </div>
                <div className="input-group">
                  <label>Sitio Web</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleFormChange}
                    placeholder="https://ejemplo.com"
                    disabled={saving}
                  />
                </div>
                <div className="input-group">
                  <label>URL del Logo</label>
                  <input
                    type="url"
                    name="logo"
                    value={formData.logo}
                    onChange={handleFormChange}
                    placeholder="https://ejemplo.com/logo.png"
                    disabled={saving}
                  />
                </div>
                <div className="input-group">
                  <label>URL del Menú externo</label>
                  <input
                    type="url"
                    name="menu"
                    value={formData.menu}
                    onChange={handleFormChange}
                    placeholder="https://ejemplo.com/menu"
                    disabled={saving}
                  />
                  <span className="field-hint">Fallback si no cargás un menú interno en la plataforma</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step-content">
                <p className="wizard-step-desc">Elegí cómo funciona la toma de pedidos en esta sucursal.</p>
                <div className="modality-cards">
                  <button
                    className={`modality-card${formData.modality === 'mozo' ? ' selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, modality: 'mozo' }))}
                    type="button"
                  >
                    <div className="modality-card-icon">🧑‍🍳</div>
                    <div className="modality-card-title">Con mozo</div>
                    <div className="modality-card-desc">El cliente pide y el mozo toma la comanda. Ideal para bares y restaurantes con servicio.</div>
                    {formData.modality === 'mozo' && (
                      <div className="modality-card-check"><FaCheck /></div>
                    )}
                  </button>

                  <div className="modality-card disabled" title="Disponible próximamente">
                    <div className="modality-card-icon">⚡</div>
                    <div className="modality-card-title">Autoservicio</div>
                    <div className="modality-card-desc">El cliente arma su pedido y paga en el momento. Ideal para food courts y hamburgueserías.</div>
                    <div className="modality-card-badge">Próximamente</div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step-content">
                <div className="table-count-row">
                  <label htmlFor="tableCount">¿Cuántas mesas querés crear?</label>
                  <input
                    id="tableCount"
                    type="number"
                    className="table-count-input"
                    value={tableCount}
                    onChange={handleTableCountChange}
                    min="0"
                    max="99"
                    disabled={saving}
                  />
                </div>

                {tableNames.length > 0 && (
                  <div className="table-name-list">
                    {tableNames.map((name, index) => (
                      <div key={index} className="table-name-item">
                        <span className="table-name-num">{index + 1}</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleTableNameChange(index, e.target.value)}
                          disabled={saving}
                          placeholder={`Mesa ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {tableNames.length === 0 && (
                  <p className="wizard-step-desc">Podés agregar mesas más tarde desde la configuración de la sucursal.</p>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="wizard-nav">
            <div className="wizard-nav-left">
              {step > 1 && (
                <button
                  className="app-button secondary"
                  onClick={handleBack}
                  disabled={saving}
                >
                  <FaArrowLeft /> Volver
                </button>
              )}
            </div>
            <div className="wizard-nav-right">
              {step < 3 && (
                <button
                  className="app-button primary"
                  onClick={handleNext}
                  disabled={saving}
                >
                  Siguiente <FaArrowRight />
                </button>
              )}
              {step === 3 && (
                <button
                  className="app-button success"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  <FaStore /> {saving ? 'Creando...' : 'Crear Sucursal'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BranchCreate;
