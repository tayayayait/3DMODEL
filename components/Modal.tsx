import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalSize = 'xs' | 'sm' | 'md' | 'lg';

type ModalAction = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'accent' | 'danger';
  ariaLabel?: string;
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: ModalAction[];
  closeOnBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
};

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const getFocusable = (container: HTMLElement | null) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
};

export const Modal = ({
  open,
  onClose,
  size = 'md',
  title,
  description,
  children,
  actions = [],
  closeOnBackdrop = true,
  initialFocusRef
}: ModalProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = 'hidden';

    const focusTarget = initialFocusRef?.current ?? getFocusable(dialogRef.current)[0];
    if (focusTarget) {
      requestAnimationFrame(() => focusTarget.focus());
    }

    return () => {
      style.overflow = prevOverflow;
      lastActiveRef.current?.focus();
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnBackdrop) {
          onClose();
        }
      }}
    >
      <div
        className={`modal modal--${size}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            {title ? (
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descriptionId} className="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="모달 닫기">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {actions.length > 0 ? (
          <div className="modal-footer" data-count={actions.length}>
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={`btn ${
                  action.variant === 'accent' ? 'btn-accent' : action.variant === 'danger' ? 'btn-danger' : ''
                }`}
                onClick={action.onClick}
                aria-label={action.ariaLabel ?? action.label}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
