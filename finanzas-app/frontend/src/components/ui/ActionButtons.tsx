import { Edit2, Trash2, CheckCircle } from 'lucide-react';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkPaid?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function ActionButtons({
  onEdit,
  onDelete,
  onMarkPaid,
  canEdit = true,
  canDelete = true,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {onMarkPaid && (
        <button
          onClick={onMarkPaid}
          aria-label="Marcar como pagada"
          title="Marcar como pagada"
          className="text-ok-ink p-2 rounded-lg hover:bg-success/10 transition-colors"
        >
          <CheckCircle size={15} />
        </button>
      )}
      {canEdit && onEdit && (
        <button
          onClick={onEdit}
          aria-label="Editar"
          title="Editar"
          className="text-info-ink p-2 rounded-lg hover:bg-primary-container/10 transition-colors"
        >
          <Edit2 size={15} />
        </button>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          aria-label="Eliminar"
          title="Eliminar"
          className="text-danger-ink p-2 rounded-lg hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
