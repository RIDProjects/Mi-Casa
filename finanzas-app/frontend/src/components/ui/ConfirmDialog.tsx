import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = '¿Eliminar?', message = 'Esta acción no se puede deshacer.', loading }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div role="alertdialog" aria-modal="true">
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle className="text-danger-500 mt-0.5 shrink-0" size={20} />
          <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}