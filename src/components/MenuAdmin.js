import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaPlus, FaTrash, FaEdit, FaGripLines, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import AdminHeader from './AdminHeader';
import {
  getBranch, getCompany,
  getCategories, createCategory, updateCategory, deleteCategory, reorderCategories,
  getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, reorderMenuItems,
} from '../services/api';
import '../styles/common.css';
import './MenuAdmin.css';

const EMPTY_CATEGORY_FORM = { name: '', isActive: true };
const EMPTY_ITEM_FORM = { name: '', description: '', price: '', imageUrl: '', isAvailable: true };

const MenuAdmin = () => {
  const { companyId, branchId } = useParams();

  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [categoryModal, setCategoryModal] = useState({ open: false, editing: null, form: EMPTY_CATEGORY_FORM });
  const [itemModal, setItemModal] = useState({ open: false, categoryId: null, editing: null, form: EMPTY_ITEM_FORM });

  const fetchData = useCallback(async () => {
    try {
      const [companyRes, branchRes, catsRes] = await Promise.all([
        getCompany(companyId),
        getBranch(branchId),
        getCategories(branchId),
      ]);
      setCompany(companyRes.data);
      setBranch(branchRes.data);

      const cats = catsRes.data;
      const itemsResponses = await Promise.all(cats.map(cat => getMenuItems(cat.id)));
      setCategories(cats.map((cat, i) => ({ ...cat, items: itemsResponses[i].data })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      setLoading(false);
    }
  }, [companyId, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpanded = (catId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleToggleCategoryActive = async (cat) => {
    const isActive = !cat.isActive;
    try {
      await updateCategory(branchId, cat.id, { isActive });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive } : c));
    } catch (error) {
      console.error('Error toggling category:', error);
    }
  };

  const handleToggleItemAvailable = async (cat, item) => {
    const isAvailable = !item.isAvailable;
    try {
      await updateMenuItem(cat.id, item.id, { isAvailable });
      setCategories(prev => prev.map(c =>
        c.id === cat.id
          ? { ...c, items: c.items.map(it => it.id === item.id ? { ...it, isAvailable } : it) }
          : c
      ));
    } catch (error) {
      console.error('Error toggling item availability:', error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;
    if (source.index === destination.index && source.droppableId === destination.droppableId) return;

    if (type === 'CATEGORY') {
      const reordered = Array.from(categories);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      setCategories(reordered);
      try {
        await reorderCategories(branchId, reordered.map(c => c.id));
      } catch (error) {
        console.error('Error reordering categories:', error);
        setCategories(categories);
      }
    } else if (type === 'ITEM') {
      const catId = parseInt(source.droppableId.replace('category-', ''));
      const catIndex = categories.findIndex(c => c.id === catId);
      if (catIndex === -1) return;
      const cat = categories[catIndex];
      const reorderedItems = Array.from(cat.items);
      const [removed] = reorderedItems.splice(source.index, 1);
      reorderedItems.splice(destination.index, 0, removed);
      const updatedCats = categories.map((c, i) =>
        i === catIndex ? { ...c, items: reorderedItems } : c
      );
      setCategories(updatedCats);
      try {
        await reorderMenuItems(catId, reorderedItems.map(it => it.id));
      } catch (error) {
        console.error('Error reordering items:', error);
        setCategories(categories);
      }
    }
  };

  // ===== Category modal =====

  const openNewCategoryModal = () =>
    setCategoryModal({ open: true, editing: null, form: { ...EMPTY_CATEGORY_FORM } });

  const openEditCategoryModal = (cat) =>
    setCategoryModal({ open: true, editing: cat, form: { name: cat.name, isActive: cat.isActive } });

  const closeCategoryModal = () =>
    setCategoryModal({ open: false, editing: null, form: EMPTY_CATEGORY_FORM });

  const handleSaveCategory = async () => {
    const { editing, form } = categoryModal;
    if (!form.name.trim()) return;
    try {
      if (editing) {
        const res = await updateCategory(branchId, editing.id, form);
        setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, ...res.data } : c));
      } else {
        const res = await createCategory(branchId, form);
        setCategories(prev => [...prev, { ...res.data, items: [] }]);
      }
      closeCategoryModal();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteCategory(branchId, cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // ===== Item modal =====

  const openNewItemModal = (catId) =>
    setItemModal({ open: true, categoryId: catId, editing: null, form: { ...EMPTY_ITEM_FORM } });

  const openEditItemModal = (catId, item) =>
    setItemModal({
      open: true,
      categoryId: catId,
      editing: item,
      form: {
        name: item.name,
        description: item.description || '',
        // Mostrar como entero (los venues AR no usan centavos; datos legacy con
        // centavos se truncan visualmente y el próximo save los normaliza).
        price: item.priceCents != null ? Math.floor(item.priceCents / 100).toString() : '',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
      },
    });

  const closeItemModal = () =>
    setItemModal({ open: false, categoryId: null, editing: null, form: EMPTY_ITEM_FORM });

  const handleSaveItem = async () => {
    const { categoryId, editing, form } = itemModal;
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      // Forzamos pesos enteros: Math.round del input (no del input*100) descarta
      // cualquier decimal que se haya colado, y después multiplicamos. AR-first.
      priceCents: form.price !== '' ? Math.round(parseFloat(form.price)) * 100 : null,
      imageUrl: form.imageUrl.trim() || null,
      isAvailable: form.isAvailable,
    };
    try {
      if (editing) {
        const res = await updateMenuItem(categoryId, editing.id, payload);
        setCategories(prev => prev.map(c =>
          c.id === categoryId
            ? { ...c, items: c.items.map(it => it.id === editing.id ? res.data : it) }
            : c
        ));
      } else {
        const res = await createMenuItem(categoryId, payload);
        setCategories(prev => prev.map(c =>
          c.id === categoryId ? { ...c, items: [...c.items, res.data] } : c
        ));
      }
      closeItemModal();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDeleteItem = async (catId, item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      await deleteMenuItem(catId, item.id);
      setCategories(prev => prev.map(c =>
        c.id === catId ? { ...c, items: c.items.filter(it => it.id !== item.id) } : c
      ));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="admin-container">
      <AdminHeader
        title={`Menú — ${branch?.name || 'Cargando...'}`}
        showBackButton
        backUrl={`/admin/${companyId}/${branchId}/config`}
      />
      <div className="admin-content">
        <div className="menu-admin">
          <div className="section-header">
            <h3>Categorías</h3>
            <button className="app-button" onClick={openNewCategoryModal}>
              <FaPlus /> Nueva categoría
            </button>
          </div>

          {categories.length === 0 && (
            <p className="menu-admin__empty">No hay categorías. Crea la primera.</p>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories" type="CATEGORY">
              {(provided) => (
                <ul
                  className="menu-admin__category-list"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {categories.map((cat, catIndex) => {
                    const isExpanded = expandedCategories.has(cat.id);
                    return (
                      <Draggable key={cat.id} draggableId={`cat-${cat.id}`} index={catIndex}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`menu-category${snapshot.isDragging ? ' menu-category--dragging' : ''}`}
                          >
                            <div className="menu-category__header" onClick={() => toggleExpanded(cat.id)}>
                              <span
                                className="menu-category__drag"
                                {...provided.dragHandleProps}
                                onClick={e => e.stopPropagation()}
                              >
                                <FaGripLines />
                              </span>
                              <span className="menu-category__chevron">
                                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                              </span>
                              <span className="menu-category__name">{cat.name}</span>
                              {!isExpanded && cat.items.length > 0 && (
                                <span className="menu-category__item-count">
                                  {cat.items.length} ítem{cat.items.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <span
                                className={`menu-status-dot menu-status-dot--${cat.isActive ? 'active' : 'inactive'}`}
                                title={cat.isActive ? 'Activa — click para desactivar' : 'Inactiva — click para activar'}
                                onClick={e => { e.stopPropagation(); handleToggleCategoryActive(cat); }}
                              />
                              <span className="menu-status-label">
                                {cat.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                              <div className="menu-category__actions" onClick={e => e.stopPropagation()}>
                                <button className="app-button small" onClick={() => openEditCategoryModal(cat)}>
                                  <FaEdit /> Editar
                                </button>
                                <button className="app-button small danger" onClick={() => handleDeleteCategory(cat)}>
                                  <FaTrash />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="menu-category__items-wrapper">
                                <Droppable droppableId={`category-${cat.id}`} type="ITEM">
                                  {(itemProvided) => (
                                    <ul
                                      className="menu-item-list"
                                      ref={itemProvided.innerRef}
                                      {...itemProvided.droppableProps}
                                    >
                                      {cat.items.map((item, itemIndex) => (
                                        <Draggable
                                          key={item.id}
                                          draggableId={`item-${item.id}`}
                                          index={itemIndex}
                                        >
                                          {(itemDraggable, itemSnapshot) => (
                                            <li
                                              ref={itemDraggable.innerRef}
                                              {...itemDraggable.draggableProps}
                                              className={`menu-item-row${itemSnapshot.isDragging ? ' menu-item-row--dragging' : ''}`}
                                            >
                                              <span
                                                className="menu-item-row__drag"
                                                {...itemDraggable.dragHandleProps}
                                              >
                                                <FaGripLines />
                                              </span>
                                              <span className="menu-item-row__name">{item.name}</span>
                                              {item.priceCents != null && (
                                                <span className="menu-item-row__price">
                                                  ${Math.floor(item.priceCents / 100).toLocaleString('es-AR')}
                                                </span>
                                              )}
                                              <span
                                                className={`menu-status-dot menu-status-dot--${item.isAvailable ? 'available' : 'unavailable'}`}
                                                title={item.isAvailable ? 'Disponible — click para agotar' : 'Agotado — click para disponibilizar'}
                                                onClick={() => handleToggleItemAvailable(cat, item)}
                                              />
                                              <span className="menu-status-label">
                                                {item.isAvailable ? 'Disponible' : 'Agotado'}
                                              </span>
                                              <div className="menu-item-row__actions">
                                                <button
                                                  className="app-button small"
                                                  onClick={() => openEditItemModal(cat.id, item)}
                                                >
                                                  <FaEdit />
                                                </button>
                                                <button
                                                  className="app-button small danger"
                                                  onClick={() => handleDeleteItem(cat.id, item)}
                                                >
                                                  <FaTrash />
                                                </button>
                                              </div>
                                            </li>
                                          )}
                                        </Draggable>
                                      ))}
                                      {itemProvided.placeholder}
                                    </ul>
                                  )}
                                </Droppable>
                                <button
                                  className="app-button small menu-category__add-item"
                                  onClick={() => openNewItemModal(cat.id)}
                                >
                                  <FaPlus /> Agregar ítem
                                </button>
                              </div>
                            )}
                          </li>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Category Modal */}
      {categoryModal.open && (
        <div className="menu-modal-backdrop" onClick={closeCategoryModal}>
          <div className="menu-modal" onClick={e => e.stopPropagation()}>
            <h3 className="menu-modal__title">
              {categoryModal.editing ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
            <div className="menu-modal__field">
              <label>Nombre *</label>
              <input
                type="text"
                value={categoryModal.form.name}
                onChange={e => setCategoryModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                placeholder="Nombre de la categoría"
                autoFocus
              />
            </div>
            <div className="menu-modal__field menu-modal__field--toggle">
              <label>Estado</label>
              <button
                className={`menu-toggle${categoryModal.form.isActive ? ' menu-toggle--on' : ''}`}
                onClick={() => setCategoryModal(m => ({ ...m, form: { ...m.form, isActive: !m.form.isActive } }))}
              >
                {categoryModal.form.isActive ? 'Activa' : 'Inactiva'}
              </button>
            </div>
            <div className="menu-modal__actions">
              <button className="app-button secondary" onClick={closeCategoryModal}>Cancelar</button>
              <button className="app-button success" onClick={handleSaveCategory}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModal.open && (
        <div className="menu-modal-backdrop" onClick={closeItemModal}>
          <div className="menu-modal" onClick={e => e.stopPropagation()}>
            <h3 className="menu-modal__title">
              {itemModal.editing ? 'Editar ítem' : 'Nuevo ítem'}
            </h3>
            <div className="menu-modal__field">
              <label>Nombre *</label>
              <input
                type="text"
                value={itemModal.form.name}
                onChange={e => setItemModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                placeholder="Nombre del ítem"
                autoFocus
              />
            </div>
            <div className="menu-modal__field">
              <label>Descripción</label>
              <textarea
                value={itemModal.form.description}
                onChange={e => setItemModal(m => ({ ...m, form: { ...m.form, description: e.target.value } }))}
                placeholder="Descripción del ítem"
                rows={3}
              />
            </div>
            <div className="menu-modal__field">
              <label>Precio ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={itemModal.form.price}
                onChange={e => setItemModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))}
                onWheel={e => e.target.blur()}
                placeholder="0"
              />
            </div>
            <div className="menu-modal__field">
              <label>URL imagen</label>
              <input
                type="text"
                value={itemModal.form.imageUrl}
                onChange={e => setItemModal(m => ({ ...m, form: { ...m.form, imageUrl: e.target.value } }))}
                placeholder="https://..."
              />
            </div>
            <div className="menu-modal__field menu-modal__field--toggle">
              <label>Disponibilidad</label>
              <button
                className={`menu-toggle${itemModal.form.isAvailable ? ' menu-toggle--on' : ''}`}
                onClick={() => setItemModal(m => ({ ...m, form: { ...m.form, isAvailable: !m.form.isAvailable } }))}
              >
                {itemModal.form.isAvailable ? 'Disponible' : 'Agotado'}
              </button>
            </div>
            <div className="menu-modal__actions">
              <button className="app-button secondary" onClick={closeItemModal}>Cancelar</button>
              <button className="app-button success" onClick={handleSaveItem}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuAdmin;
