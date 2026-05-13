import { useEffect, useRef } from "react";
import { getAvailableInterfaces, getPortCompatibility } from "../../store/useConnectionManager";

const ITYPE_COLOR = {
  gigabit:     "#378ADD",
  fastethernet:"#1D9E75",
  serial:      "#d2a8ff",
  management:  "#e3b341",
};

/**
 * InterfacePicker
 * Petit popup qui apparaît au-dessus d'un device pour choisir une interface
 * lors du câblage. Se ferme sur Échap ou clic extérieur.
 *
 * Props:
 *   device     - le device concerné
 *   x, y       - position canvas du device
 *   canvasRect - getBoundingClientRect() du canvas (pour positionner le popup)
 *   onPick     - (deviceId, ifaceName) => void
 *   onCancel   - () => void
 *   excludeLinked - si true, n'affiche que les interfaces libres
 */
export function InterfacePicker({ device, x, y, onPick, onCancel, excludeLinked = true, links = {}, filterCompatibleWith = null }) {
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    setTimeout(() => ref.current?.focus(), 0);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  // Filtrer les interfaces disponibles via le connection manager
  const available = getAvailableInterfaces(device, links).filter(iface => {
    // Si on filtre par compatibilité de type (step "to" du câblage)
    if (filterCompatibleWith) {
      const { compatible } = getPortCompatibility(filterCompatibleWith, iface.type);
      if (!compatible) return false;
    }
    return true;
  });

  if (!available.length) {
    return (
      <div className="ifpicker" style={{ left: x, top: y - 20 }} ref={ref} tabIndex={-1}>
        <div className="ifpicker__title">{device.name}</div>
        <div className="ifpicker__empty">Toutes les interfaces sont câblées</div>
        <button className="ifpicker__cancel" onClick={onCancel}>Annuler</button>
      </div>
    );
  }

  return (
    <div
      className="ifpicker"
      style={{ left: x, top: y - 20 }}
      ref={ref}
      tabIndex={-1}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) onCancel(); }}
    >
      <div className="ifpicker__title">{device.name} — choisir interface</div>
      {available.map(iface => (
        <button
          key={iface.name}
          className="ifpicker__item"
          onClick={() => onPick(device.id, iface.name)}
        >
          <span
            className="ifpicker__dot"
            style={{ background: ITYPE_COLOR[iface.type] ?? "#555" }}
          />
          <span className="ifpicker__name">{iface.name}</span>
          <span className="ifpicker__ip">
            {iface.ip ? `${iface.ip}/${iface.prefix}` : iface.status === "up" ? "up" : "down"}
          </span>
        </button>
      ))}
    </div>
  );
}
