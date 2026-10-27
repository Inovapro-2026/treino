import React, { useState } from 'react';
import { X, Scale, Calendar, Plus, Save } from 'lucide-react';
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
  const [waistCm, setWaistCm] = useState<string>(
    initialData?.waistCm !== undefined ? String(initialData.waistCm) : ''
  );
  const [chestCm, setChestCm] = useState<string>(
    initialData?.chestCm !== undefined ? String(initialData.chestCm) : ''
  );
  const [armCm, setArmCm] = useState<string>(
    initialData?.armCm !== undefined ? String(initialData.armCm) : ''
  );
  const [thighCm, setThighCm] = useState<string>(
    initialData?.thighCm !== undefined ? String(initialData.thighCm) : ''
  );
  const [hipCm, setHipCm] = useState<string>(
    initialData?.hipCm !== undefined ? String(initialData.hipCm) : ''
  );
  const [calfCm, setCalfCm] = useState<string>(
    initialData?.calfCm !== undefined ? String(initialData.calfCm) : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

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
      waistCm: parseNum(waistCm),
      chestCm: parseNum(chestCm),
      armCm: parseNum(armCm),
      thighCm: parseNum(thighCm),
      hipCm: parseNum(hipCm),
      calfCm: parseNum(calfCm),
      notes: notes.trim() || undefined,
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
                {initialData ? 'Editar Medidas Físicas' : 'Registrar Peso & Medidas'}
              </h2>
              <p className="text-xs text-zinc-400">
                Campos vazios serão mantidos em branco (não zerados).
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
          {/* Date & Weight */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Circumference Measurements */}
          <div className="pt-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Circunferências Corporais (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Braço (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  placeholder="Ex: 38.0"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Peito / Tórax (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  placeholder="Ex: 104.5"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  placeholder="Ex: 82.0"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Quadril (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  placeholder="Ex: 98.0"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Coxa (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  placeholder="Ex: 61.0"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Panturrilha (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calfCm}
                  onChange={(e) => setCalfCm(e.target.value)}
                  placeholder="Ex: 39.0"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Observações (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Em jejum, logo pela manhã..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 focus:border-lime-400 focus:outline-hidden"
            />
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
