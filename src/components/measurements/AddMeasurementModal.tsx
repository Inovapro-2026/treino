import React, { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { BodyMeasurement } from '../../types';

interface AddMeasurementModalProps {
  isOpen: boolean;
  onSave: (m: BodyMeasurement) => void;
  onClose: () => void;
  initialData?: BodyMeasurement | null;
}

export const AddMeasurementModal: React.FC<AddMeasurementModalProps> = ({
  isOpen,
  onSave,
  onClose,
  initialData,
}) => {
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [weightKg, setWeightKg] = useState<string>(
    initialData?.weightKg !== undefined ? String(initialData.weightKg) : ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parseNum = (val: string): number | undefined => {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const num = parseFloat(trimmed.replace(',', '.'));
      return isNaN(num) ? undefined : num;
    };

    const measurement: BodyMeasurement = {
      id: initialData?.id || `meas_${Date.now()}`,
      date,
      weightKg: parseNum(weightKg),
      // Preserva valores antigos de circunferências/observações ao editar,
      // sem exibi-los no formulário.
      waistCm: initialData?.waistCm,
      chestCm: initialData?.chestCm,
      armCm: initialData?.armCm,
      thighCm: initialData?.thighCm,
      hipCm: initialData?.hipCm,
      calfCm: initialData?.calfCm,
      notes: initialData?.notes,
    };

    onSave(measurement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-zinc-100 my-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialData ? 'Editar Peso Corporal' : 'Registrar Peso Corporal'}
              </h2>
              <p className="text-xs text-zinc-400">
                Registre seu peso corporal para acompanhar sua evolução.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Peso Corporal (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Ex: 78.5"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
