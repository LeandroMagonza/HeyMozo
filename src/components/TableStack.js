import React, { Fragment } from 'react';
import './TableStack.css';

const LAYER_OFFSET = 7;
const MAX_SHADOWS = 2;

// Pila visual heterogénea: agrupa todos los items pending de UNA mesa
// (Orders + Events). Cada item conserva su tipo y su botón propio. El
// expand/collapse, las shadows y el "+N" son cosmética de OpShell;
// OpShell sigue siendo dueño de las actions via `renderItem`.
const TableStack = ({
  items,
  tableId,
  tableName,
  expanded,
  onToggle,
  renderItem,
}) => {
  const top = items[0];
  const shadowCount = Math.min(items.length - 1, MAX_SHADOWS);
  const hiddenCount = Math.max(0, items.length - 1 - MAX_SHADOWS);

  if (expanded) {
    return (
      <div className="table-stack table-stack--expanded">
        <button type="button" className="table-stack__header" onClick={onToggle}>
          <span className="table-stack__header-name">
            {tableName ?? `Mesa ${tableId}`}
          </span>
          <span className="table-stack__header-count">
            {items.length} {items.length === 1 ? 'alerta' : 'alertas'}
          </span>
          <span className="table-stack__header-chevron" aria-hidden="true">▲</span>
        </button>
        <div className="table-stack__list">
          {items.map((item) => (
            <Fragment key={item.id}>{renderItem(item, {})}</Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Collapsed: shadows behind, top card foreground, "+N" if more hidden.
  return (
    <div className="table-stack table-stack--collapsed">
      {Array.from({ length: shadowCount }).map((_, i) => (
        <div
          key={`shadow-${i}`}
          className="table-stack__shadow"
          style={{
            top: `${(i + 1) * LAYER_OFFSET}px`,
            left: `${(i + 1) * LAYER_OFFSET}px`,
            opacity: i === 0 ? 0.85 : 0.7,
          }}
          aria-hidden="true"
        >
          {renderItem(top, { asShadow: true })}
        </div>
      ))}

      <div className="table-stack__top">
        {renderItem(top, { onCardClick: onToggle })}
        {hiddenCount > 0 && (
          <div
            className="table-stack__more-badge"
            aria-label={`${hiddenCount} alertas más`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableStack;
