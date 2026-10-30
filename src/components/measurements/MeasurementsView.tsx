import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { BodyMeasurement } from '../../types';
import { AddMeasurementModal } from './AddMeasurementModal';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface MeasurementsViewProps {
  measurements: BodyMeasurement[];
  onSaveMeasurement: (m: BodyMeasurement) => void;
  onDeleteMeasurement: (id: string) => void;
}

export const MeasurementsView: React.FC<MeasurementsViewProps> = ({
  measurements,
  onSaveMeasurement,
  onDeleteMeasurement,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<BodyMeasurement | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sortedMeasurements[0];
  const previous = sortedMeasurements[1];

  const getDelta = (curr?: number, prev?: number) => {
    if (curr === undefined || prev === undefined) return null;
    const diff = curr - prev;
    return diff;
  };

  const weightDelta = getDelta(latest?.weightKg, previous?.weightKg);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Peso Corporal
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Acompanhe seu peso corporal ao longo do tempo.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedForEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Peso</span>
        </button>
      </div>

      {/* Latest Weight Summary Card */}
      {latest ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Peso Atual
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {latest.weightKg !== undefined ? `${latest.weightKg} kg` : '—'}
              </span>
              {weightDelta !== null && (
                <span
                  className={`text-xs font-bold flex items-center ${
                    weightDelta >= 0 ? 'text-lime-400' : 'text-zinc-400'
                  }`}
                >
                  {weightDelta >= 0 ? `+${weightDelta.toFixed(1)}` : weightDelta.toFixed(1)} kg
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">{latest.date}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
          <Scale className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">Nenhum peso registrado ainda</p>
          <p className="text-xs text-zinc-500 mt-1">
            Cadastre seu peso corporal para acompanhar sua evolução.
          </p>
        </div>
      )}

      {/* History Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Histórico de Registros ({sortedMeasurements.length})
          </h3>
        </div>

        {sortedMeasurements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">DATA</th>
                  <th className="p-3.5 whitespace-nowrap text-center">PESO (KG)</th>
                  <th className="p-3.5 whitespace-nowrap text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {sortedMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="p-3.5 text-center font-bold text-lime-400 font-mono">
                      {m.weightKg !== undefined ? `${m.weightKg} kg` : '—'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedForEdit(m);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-white rounded-md"
                          title="Editar peso"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIdToDelete(m.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 rounded-md"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            Nenhum registro encontrado.
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AddMeasurementModal
        isOpen={isModalOpen}
        onSave={onSaveMeasurement}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedForEdit(null);
        }}
        initialData={selectedForEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={idToDelete !== null}
        title="Excluir Registro de Peso?"
        description="Este registro será permanentemente apagado do seu histórico."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (idToDelete) onDeleteMeasurement(idToDelete);
          setIdToDelete(null);
        }}
        onCancel={() => setIdToDelete(null)}
      />
    </div>
  );
};
