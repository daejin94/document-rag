import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" aria-modal="true" role="dialog">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} title="닫기" type="button">
            <X size={16} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
