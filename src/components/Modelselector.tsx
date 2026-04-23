import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ModelInfo } from "../api/client";
import "./Modelselector.css";

interface Props {
  models: ModelInfo[];
  selected: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// const SPEED_LABEL: Record<string, string> = {
//   fast: "Rapide",
//   medium: "Modéré",
//   slow: "Lent",
// };

// const COST_LABEL: Record<string, string> = {
//   low: "$",
//   medium: "$$",
//   high: "$$$",
// };

export function ModelSelector({ models, selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = models.find((m) => m.id === selected) ?? models[0];

  const openDropdown = () => {
    if (disabled || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      const dd = document.getElementById("ms-portal-dropdown");
      if (!btnRef.current?.contains(target) && !dd?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  if (!current) return null;

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const dropdown =
    open &&
    createPortal(
      <div
        id="ms-portal-dropdown"
        className="ms-dropdown"
        style={{
          position: "fixed",
          bottom: `calc(100vh - ${pos.top}px)`,
          left: pos.left,
          minWidth: 260,
        }}
      >
        <div className="ms-list">
          {models.map((m) => (
            <button
              key={m.id}
              className={`ms-item ${selected === m.id ? "active" : ""}`}
              onClick={() => select(m.id)}
            >
              <div className="ms-item-main">
                <span className="ms-item-label">{m.label}</span>
                {/* <span className="ms-item-desc">{m.description}</span> */}
              </div>
              <div className="ms-item-meta">
                {/* <span className="ms-tag">{SPEED_LABEL[m.speed]}</span> */}
                {/* <span className="ms-tag">{COST_LABEL[m.cost_tier]}</span> */}
                {selected === m.id && (
                  <svg className="ms-check" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1.5 6l3.5 3.5L10.5 2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="ms-wrap">
      <button
        ref={btnRef}
        className={`ms-btn ${open ? "open" : ""}`}
        onClick={openDropdown}
        disabled={disabled}
        title={current.description}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6M4.2 19.8l4.3-4.3M15.5 8.5l4.3-4.3" />
        </svg>
        <span className="ms-label">{current.label}</span>
        <svg className="ms-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.5 3.5L5 7l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}