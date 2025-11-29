import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Clock,
  Trash2,
  Play,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Printer,
  GripVertical,
  SkipForward,
  ExternalLink,
  Power,
  StopCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { PrintQueueItem } from '../api/client';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'ASAP';
  // Parse ISO string - it's in UTC, convert to local for display
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < -60000) return 'Overdue';
  if (diff < 0) return 'Now';
  if (diff < 60000) return 'In less than a minute';
  if (diff < 3600000) return `In ${Math.round(diff / 60000)} min`;
  if (diff < 86400000) return `In ${Math.round(diff / 3600000)} hours`;
  return date.toLocaleString();
}

function StatusBadge({ status }: { status: PrintQueueItem['status'] }) {
  const config = {
    pending: { icon: Clock, color: 'text-yellow-400 bg-yellow-400/10', label: 'Pending' },
    printing: { icon: Play, color: 'text-blue-400 bg-blue-400/10', label: 'Printing' },
    completed: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-400 bg-red-400/10', label: 'Failed' },
    skipped: { icon: SkipForward, color: 'text-orange-400 bg-orange-400/10', label: 'Skipped' },
    cancelled: { icon: X, color: 'text-gray-400 bg-gray-400/10', label: 'Cancelled' },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function QueueItemRow({
  item,
  onCancel,
  onRemove,
  onStop,
}: {
  item: PrintQueueItem;
  onCancel: (id: number) => void;
  onRemove: (id: number) => void;
  onStop: (id: number) => void;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-bambu-dark-secondary rounded-lg">
        {item.status === 'pending' && (
          <GripVertical className="w-5 h-5 text-bambu-gray cursor-grab" />
        )}

        {/* Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 bg-bambu-dark rounded-lg overflow-hidden">
          {item.archive_thumbnail ? (
            <img
              src={api.getArchiveThumbnail(item.archive_id)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bambu-gray">
              <Calendar className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium truncate">
              {item.archive_name || `Archive #${item.archive_id}`}
            </p>
            <Link
              to={`/archives?highlight=${item.archive_id}`}
              className="text-bambu-gray hover:text-bambu-green transition-colors flex-shrink-0"
              title="View archive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-bambu-gray">
            <span className="flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" />
              {item.printer_name || `Printer #${item.printer_id}`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(item.scheduled_time)}
            </span>
          </div>
          {item.require_previous_success && (
            <p className="text-xs text-orange-400 mt-1">
              Requires previous print to succeed
            </p>
          )}
          {item.auto_off_after && (
            <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
              <Power className="w-3 h-3" />
              Will power off when done
            </p>
          )}
          {item.error_message && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {item.error_message}
            </p>
          )}
        </div>

        {/* Status */}
        <StatusBadge status={item.status} />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {item.status === 'printing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStopConfirm(true)}
              title="Stop Print"
              className="text-red-400 hover:text-red-300"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          )}
          {item.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {['completed', 'failed', 'skipped', 'cancelled'].includes(item.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRemoveConfirm(true)}
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <ConfirmModal
          title="Cancel Scheduled Print"
          message={`Are you sure you want to cancel "${item.archive_name || 'this print'}"? It will be removed from the queue.`}
          confirmText="Cancel Print"
          variant="danger"
          onConfirm={() => {
            onCancel(item.id);
            setShowCancelConfirm(false);
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <ConfirmModal
          title="Remove from History"
          message={`Are you sure you want to remove "${item.archive_name || 'this item'}" from the queue history?`}
          confirmText="Remove"
          variant="danger"
          onConfirm={() => {
            onRemove(item.id);
            setShowRemoveConfirm(false);
          }}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <ConfirmModal
          title="Stop Print"
          message={`Are you sure you want to stop the current print "${item.archive_name || 'this print'}"? This will cancel the print job on the printer.`}
          confirmText="Stop Print"
          variant="danger"
          onConfirm={() => {
            onStop(item.id);
            setShowStopConfirm(false);
          }}
          onCancel={() => setShowStopConfirm(false)}
        />
      )}
    </>
  );
}

export function QueuePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [filterPrinter, setFilterPrinter] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue', filterPrinter, filterStatus],
    queryFn: () => api.getQueue(filterPrinter || undefined, filterStatus || undefined),
    refetchInterval: 10000,
  });

  const { data: printers } = useQuery({
    queryKey: ['printers'],
    queryFn: () => api.getPrinters(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.cancelQueueItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      showToast('Queue item cancelled');
    },
    onError: () => showToast('Failed to cancel item', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.removeFromQueue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      showToast('Queue item removed');
    },
    onError: () => showToast('Failed to remove item', 'error'),
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => api.stopQueueItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      showToast('Print stopped');
    },
    onError: () => showToast('Failed to stop print', 'error'),
  });

  const pendingItems = queue?.filter(i => i.status === 'pending') || [];
  const activeItems = queue?.filter(i => i.status === 'printing') || [];
  const historyItems = queue?.filter(i => ['completed', 'failed', 'skipped', 'cancelled'].includes(i.status)) || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Print Queue</h1>
          <p className="text-bambu-gray mt-1">Schedule and manage print jobs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          className="px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
          value={filterPrinter || ''}
          onChange={(e) => setFilterPrinter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Printers</option>
          {printers?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="printing">Printing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-bambu-gray">Loading...</div>
      ) : queue?.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No prints scheduled</h3>
          <p className="text-bambu-gray">
            Schedule a print from the Archives page using the "Schedule" option in the context menu.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Prints */}
          {activeItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Currently Printing
              </h2>
              <div className="space-y-2">
                {activeItems.map((item) => (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onRemove={(id) => removeMutation.mutate(id)}
                    onStop={(id) => stopMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Queue */}
          {pendingItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Queued ({pendingItems.length})
              </h2>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onRemove={(id) => removeMutation.mutate(id)}
                    onStop={(id) => stopMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {historyItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-bambu-gray" />
                History ({historyItems.length})
              </h2>
              <div className="space-y-2">
                {historyItems.slice(0, 10).map((item) => (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onRemove={(id) => removeMutation.mutate(id)}
                    onStop={(id) => stopMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
