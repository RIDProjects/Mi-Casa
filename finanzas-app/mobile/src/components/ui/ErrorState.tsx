import React from 'react';
import EmptyState from './EmptyState';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'No pudimos cargar los datos. Revisa tu conexión e inténtalo de nuevo.', onRetry }: Props) {
  return <EmptyState icon="cloud-offline-outline" title="Algo salió mal" subtitle={message} actionLabel={onRetry ? 'Reintentar' : undefined} onAction={onRetry} />;
}
