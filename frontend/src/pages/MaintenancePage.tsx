import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Loader2,
  Check,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Droplet,
  Flame,
  Ruler,
  Sparkles,
  Square,
  Cable,
  Edit3,
} from 'lucide-react';
import { api } from '../api/client';
import type { MaintenanceStatus, PrinterMaintenanceOverview } from '../api/client';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Toggle } from '../components/Toggle';
import { useToast } from '../contexts/ToastContext';

// Icon mapping for maintenance types
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplet,
  Flame,
  Ruler,
  Sparkles,
  Square,
  Cable,
  Wrench,
};

function getIcon(iconName: string | null) {
  if (!iconName) return Wrench;
  return iconMap[iconName] || Wrench;
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
}

function formatHoursLong(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) {
    return `${m} minutes`;
  }
  if (m === 0) {
    return `${h} hours`;
  }
  return `${h}h ${m}m`;
}

// Simple row for a maintenance item
function MaintenanceRow({
  item,
  onPerform,
  onToggle,
}: {
  item: MaintenanceStatus;
  onPerform: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
}) {
  const Icon = getIcon(item.maintenance_type_icon);

  const progressPercent = Math.max(0, Math.min(100,
    ((item.interval_hours - item.hours_until_due) / item.interval_hours) * 100
  ));

  const getStatusColor = () => {
    if (!item.enabled) return 'text-bambu-gray';
    if (item.is_due) return 'text-red-400';
    if (item.is_warning) return 'text-yellow-400';
    return 'text-bambu-green';
  };

  const getProgressColor = () => {
    if (!item.enabled) return 'bg-bambu-gray/30';
    if (item.is_due) return 'bg-red-500';
    if (item.is_warning) return 'bg-yellow-500';
    return 'bg-bambu-green';
  };

  const getStatusText = () => {
    if (!item.enabled) return 'Disabled';
    if (item.is_due) return `Overdue by ${formatHours(Math.abs(item.hours_until_due))}`;
    if (item.is_warning) return `Due in ${formatHours(item.hours_until_due)}`;
    return `${formatHours(item.hours_until_due)} left`;
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg ${
      item.is_due ? 'bg-red-500/10' :
      item.is_warning ? 'bg-yellow-500/10' :
      'bg-bambu-dark'
    }`}>
      {/* Icon & Name */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <Icon className={`w-4 h-4 ${getStatusColor()}`} />
        <span className={`text-sm ${item.enabled ? 'text-white' : 'text-bambu-gray'}`}>
          {item.maintenance_type_name}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 max-w-[200px]">
        <div className="w-full h-1.5 bg-bambu-dark-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getProgressColor()}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className={`text-xs min-w-[120px] ${getStatusColor()}`}>
        {item.is_due && <AlertTriangle className="w-3 h-3 inline mr-1" />}
        {item.is_warning && <Clock className="w-3 h-3 inline mr-1" />}
        {!item.is_due && !item.is_warning && item.enabled && <Check className="w-3 h-3 inline mr-1" />}
        {getStatusText()}
      </div>

      {/* Enable/Disable toggle */}
      <Toggle
        checked={item.enabled}
        onChange={(checked) => onToggle(item.id, checked)}
      />

      {/* Reset button */}
      <Button
        size="sm"
        variant={item.is_due ? 'primary' : 'secondary'}
        onClick={() => onPerform(item.id)}
        disabled={!item.enabled}
        className="min-w-[70px]"
      >
        <RotateCcw className="w-3 h-3" />
        Done
      </Button>
    </div>
  );
}

// Printer section
function PrinterSection({
  overview,
  onPerform,
  onToggle,
  onSetHours,
}: {
  overview: PrinterMaintenanceOverview;
  onPerform: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onSetHours: (printerId: number, hours: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursInput, setHoursInput] = useState(overview.total_print_hours.toFixed(1));

  // Sort items: first by maintenance_type_id for consistency, then by urgency
  const sortedItems = [...overview.maintenance_items].sort((a, b) => {
    // Primary sort by maintenance type ID for consistent ordering across printers
    return a.maintenance_type_id - b.maintenance_type_id;
  });

  // Find the next upcoming task (most urgent enabled item)
  const nextTask = [...overview.maintenance_items]
    .filter(item => item.enabled)
    .sort((a, b) => {
      // Sort by urgency: overdue first, then warnings, then by hours until due
      if (a.is_due && !b.is_due) return -1;
      if (!a.is_due && b.is_due) return 1;
      if (a.is_warning && !b.is_warning) return -1;
      if (!a.is_warning && b.is_warning) return 1;
      return a.hours_until_due - b.hours_until_due;
    })[0];

  const handleSaveHours = () => {
    const hours = parseFloat(hoursInput);
    if (!isNaN(hours) && hours >= 0) {
      onSetHours(overview.printer_id, hours);
      setEditingHours(false);
    }
  };

  return (
    <Card>
      <div className="p-4">
        {/* Header row with printer name and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">{overview.printer_name}</h2>
            {overview.due_count > 0 && (
              <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overview.due_count} overdue
              </span>
            )}
            {overview.warning_count > 0 && (
              <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {overview.warning_count} due soon
              </span>
            )}
            {overview.due_count === 0 && overview.warning_count === 0 && (
              <span className="px-2.5 py-1 bg-bambu-green/20 text-bambu-green text-xs font-medium rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                All good
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-bambu-gray hover:text-white hover:bg-bambu-dark rounded transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Details
              </>
            )}
          </button>
        </div>

        {/* Info cards row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Print Hours Card */}
          <div className="p-3 bg-bambu-dark rounded-lg">
            <div className="text-xs text-bambu-gray mb-1 uppercase tracking-wide">Total Print Time</div>
            {editingHours ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHours();
                    if (e.key === 'Escape') setEditingHours(false);
                  }}
                  className="w-20 px-2 py-1 bg-bambu-dark-secondary border border-bambu-dark-tertiary rounded text-white text-lg font-semibold"
                  min="0"
                  step="1"
                  autoFocus
                />
                <span className="text-sm text-bambu-gray">hours</span>
                <div className="flex gap-1 ml-auto">
                  <Button size="sm" onClick={handleSaveHours}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingHours(false)}>✕</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setHoursInput(Math.round(overview.total_print_hours).toString());
                  setEditingHours(true);
                }}
                className="flex items-center gap-2 group"
                title="Click to edit total print hours"
              >
                <span className="text-xl font-semibold text-white group-hover:text-bambu-green transition-colors">
                  {formatHoursLong(overview.total_print_hours)}
                </span>
                <Edit3 className="w-4 h-4 text-bambu-gray group-hover:text-bambu-green transition-colors" />
              </button>
            )}
          </div>

          {/* Next Maintenance Card */}
          <div className={`p-3 rounded-lg ${
            nextTask?.is_due ? 'bg-red-500/10' :
            nextTask?.is_warning ? 'bg-yellow-500/10' :
            'bg-bambu-dark'
          }`}>
            <div className="text-xs text-bambu-gray mb-1 uppercase tracking-wide">Next Maintenance</div>
            {nextTask ? (
              <div>
                <div className={`text-lg font-semibold ${
                  nextTask.is_due ? 'text-red-400' :
                  nextTask.is_warning ? 'text-yellow-400' :
                  'text-white'
                }`}>
                  {nextTask.maintenance_type_name}
                </div>
                <div className={`text-sm ${
                  nextTask.is_due ? 'text-red-400' :
                  nextTask.is_warning ? 'text-yellow-400' :
                  'text-bambu-gray'
                }`}>
                  {nextTask.is_due ? (
                    <>Overdue by {formatHours(Math.abs(nextTask.hours_until_due))}</>
                  ) : (
                    <>Due in {formatHours(nextTask.hours_until_due)}</>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-white">No tasks enabled</div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 space-y-2 border-t border-bambu-dark-tertiary mt-4">
          <div className="pt-4">
            {sortedItems.map((item) => (
              <MaintenanceRow
                key={item.id}
                item={item}
                onPerform={onPerform}
                onToggle={onToggle}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Settings modal for managing custom types
function SettingsModal({
  onClose,
  types,
  onAddType,
  onDeleteType,
}: {
  onClose: () => void;
  types: Array<{ id: number; name: string; default_interval_hours: number; icon: string | null; is_system: boolean }>;
  onAddType: (data: { name: string; description?: string; default_interval_hours: number; icon?: string }) => void;
  onDeleteType: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('100');
  const [icon, setIcon] = useState('Wrench');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && parseFloat(interval) > 0) {
      onAddType({
        name: name.trim(),
        default_interval_hours: parseFloat(interval),
        icon,
      });
      setName('');
      setInterval('100');
    }
  };

  const customTypes = types.filter(t => !t.is_system);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bambu-dark-secondary rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Maintenance Settings</h3>

        {/* Existing custom types */}
        {customTypes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm text-bambu-gray mb-2">Custom Maintenance Types</h4>
            <div className="space-y-2">
              {customTypes.map((type) => {
                const Icon = getIcon(type.icon);
                return (
                  <div key={type.id} className="flex items-center justify-between p-2 bg-bambu-dark rounded">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-bambu-gray" />
                      <span className="text-white text-sm">{type.name}</span>
                      <span className="text-bambu-gray text-xs">({type.default_interval_hours}h)</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${type.name}"?`)) {
                          onDeleteType(type.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-bambu-dark-tertiary text-bambu-gray hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add new type */}
        <form onSubmit={handleSubmit}>
          <h4 className="text-sm text-bambu-gray mb-2">Add Custom Type</h4>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded text-white text-sm"
              placeholder="Name (e.g., Replace HEPA Filter)"
            />
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-20 px-2 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded text-white text-sm"
              placeholder="Hours"
              min="1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Object.keys(iconMap).map((iconName) => {
                const IconComp = iconMap[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-1.5 rounded ${
                      icon === iconName
                        ? 'bg-bambu-green text-white'
                        : 'bg-bambu-dark text-bambu-gray hover:text-white'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-bambu-dark-tertiary flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showSettings, setShowSettings] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['maintenanceOverview'],
    queryFn: api.getMaintenanceOverview,
  });

  const { data: types } = useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: api.getMaintenanceTypes,
  });

  const performMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      api.performMaintenance(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceOverview'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceSummary'] });
      showToast('Maintenance marked as done');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { custom_interval_hours?: number | null; enabled?: boolean } }) =>
      api.updateMaintenanceItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceOverview'] });
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const addTypeMutation = useMutation({
    mutationFn: api.createMaintenanceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceOverview'] });
      showToast('Maintenance type added');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: api.deleteMaintenanceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceOverview'] });
      showToast('Maintenance type deleted');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const setHoursMutation = useMutation({
    mutationFn: ({ printerId, hours }: { printerId: number; hours: number }) =>
      api.setPrinterHours(printerId, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceOverview'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceSummary'] });
      showToast('Print hours updated');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handlePerform = (id: number) => {
    performMutation.mutate({ id });
  };

  const handleToggle = (id: number, enabled: boolean) => {
    updateMutation.mutate({ id, data: { enabled } });
  };

  const handleSetHours = (printerId: number, hours: number) => {
    setHoursMutation.mutate({ printerId, hours });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
      </div>
    );
  }

  // Calculate totals
  const totalDue = overview?.reduce((sum, p) => sum + p.due_count, 0) || 0;
  const totalWarning = overview?.reduce((sum, p) => sum + p.warning_count, 0) || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance</h1>
          <p className="text-bambu-gray text-sm">
            {totalDue > 0 && <span className="text-red-400">{totalDue} tasks overdue</span>}
            {totalDue > 0 && totalWarning > 0 && ' · '}
            {totalWarning > 0 && <span className="text-yellow-400">{totalWarning} due soon</span>}
            {totalDue === 0 && totalWarning === 0 && 'All maintenance up to date'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowSettings(true)}>
          <Settings2 className="w-4 h-4" />
          Settings
        </Button>
      </div>

      {/* Printers - sorted alphabetically */}
      <div className="space-y-4">
        {overview && overview.length > 0 ? (
          [...overview].sort((a, b) => a.printer_name.localeCompare(b.printer_name)).map((printerOverview) => (
            <PrinterSection
              key={printerOverview.printer_id}
              overview={printerOverview}
              onPerform={handlePerform}
              onToggle={handleToggle}
              onSetHours={handleSetHours}
            />
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-bambu-gray/30" />
              <p className="text-bambu-gray">No printers configured</p>
              <p className="text-sm text-bambu-gray/70 mt-1">
                Add printers to start tracking maintenance
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && types && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          types={types}
          onAddType={(data) => addTypeMutation.mutate(data)}
          onDeleteType={(id) => deleteTypeMutation.mutate(id)}
        />
      )}
    </div>
  );
}
