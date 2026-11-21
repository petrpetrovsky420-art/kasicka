import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';
import { ToastViewport } from './Toasts';

type ModalProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
  /** Něco vedle nadpisu, třeba štítek stavu. */
  aside?: ReactNode;
  /** Kliknutí vedle okna ho zavře (u formulářů radši ne, ať se neztratí rozepsané údaje). */
  closeOnBackdrop?: boolean;
};

/**
 * Modální okno nad nativním <dialog>: prohlížeč sám drží fokus uvnitř okna a Escape ho zavře.
 * Okno se vykresluje jen když je otevřené; při zavření vrátí fokus tam, kde byl.
 */
export function Modal({ title, onClose, children, size = 'md', className, style, aside, closeOnBackdrop = true }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  const classes = ['modal', `modal-${size}`, className].filter(Boolean).join(' ');

  return (
    <dialog
      ref={ref}
      className={classes}
      style={style}
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (closeOnBackdrop && pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="modal-frame">
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          {aside}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Zavřít okno">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </div>
      <ToastViewport />
    </dialog>
  );
}
