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
          title="Marcar como pagada"
          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-2.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
        >
          <CheckCircle size={15} />
        </button>
      )}
      {canEdit && onEdit && (
        <button
          onClick={onEdit}
          title="Editar"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <Edit2 size={15} />
        </button>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          title="Eliminar"
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
