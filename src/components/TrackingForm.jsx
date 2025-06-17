import { useState } from 'preact/hooks';

const STATUS_ORDER = ['CREADO', 'EN_TRANSITO', 'EN_ENTREGA', 'ENTREGADO'];
const STATUS_LABELS = {
  CREADO: 'Procesado',
  EN_TRANSITO: 'Enviado',
  EN_ENTREGA: 'En Reparto',
  ENTREGADO: 'Entregado',
};

export default function TrackingForm() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = event.target.elements.codigo.value;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedStepIndex(null);
    try {
      const response = await fetch(`https://gestion-backend-code4bi.onrender.com/api/seguimiento/estado/?codigo=${code}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ocurrió un error en la solicitud.');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  let currentStepIndex = -1;
  let hasErrorState = false;
  const historyMap = new Map();

  if (data) {
    const latestStatusFromApi = data.historial[0]?.raw_estado;
    if (latestStatusFromApi === 'INCIDENCIA') {
      hasErrorState = true;
    } else {
      currentStepIndex = STATUS_ORDER.indexOf(latestStatusFromApi);
      data.historial.forEach(item => {
        historyMap.set(item.raw_estado, item);
      });
    }
  }

  const handleStepClick = (index) => {
    if (index > currentStepIndex) return;
    if (index === selectedStepIndex) {
      setSelectedStepIndex(null);
    } else {
      setSelectedStepIndex(index);
    }
  };

  const selectedStepDetails = selectedStepIndex !== null ? historyMap.get(STATUS_ORDER[selectedStepIndex]) : null;

  return (
    <div className="tracking-wrapper">
      <form onSubmit={handleSubmit} className="tracking-form">
        <div className="input-group">
          <input type="text" name="codigo" placeholder="Introduce tu código de seguimiento" required />
          <button type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Rastrear'}
          </button>
        </div>
      </form>

      {loading && <p className="status-loading">Buscando...</p>}
      
      {!loading && !error && data && (
        <div className="tracker-card">
          <div className="tracker-header">
            <div><span className="header-label">PEDIDO</span><span className="header-value">#{data.codigo}</span></div>
            <div><span className="header-label">Última Actualización</span><span className="header-value">{new Date(data.historial[0].fecha).toLocaleDateString('es-CO')}</span></div>
          </div>
          
          {hasErrorState ? (
            <div className="error-state-message">...</div>
          ) : (
            <>
              <div className="progress-bar-container">
                {STATUS_ORDER.map((status, index) => (
                  <div key={status} className={`step ${index <= currentStepIndex ? 'completed' : ''} ${selectedStepIndex === index ? 'selected' : ''}`} onClick={() => handleStepClick(index)}>
                    <div className="node"></div>
                    {/* La línea solo se renderiza si no es el último paso */}
                    {index < STATUS_ORDER.length - 1 && (
                      // CORRECCIÓN CLAVE: La línea se completa si su índice es MENOR que el del paso actual
                      <div className={`line ${index < currentStepIndex ? 'completed' : ''}`}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Las etiquetas de estado no necesitan cambios de lógica */}
              <div className="status-labels">
                {STATUS_ORDER.map((status, index) => (
                  <div key={status} className={`label-step ${index <= currentStepIndex ? 'completed' : ''} ${selectedStepIndex === index ? 'selected' : ''}`} onClick={() => handleStepClick(index)}>
                    <div className="icon">
                      {index === 0 && '📋'} {index === 1 && '📦'}
                      {index === 2 && '🚚'} {index === 3 && '🏠'}
                    </div>
                    <span>{STATUS_LABELS[status]}</span>
                  </div>
                ))}
              </div>

              <div className={`detail-panel ${selectedStepDetails ? 'visible' : ''}`}>
                {selectedStepDetails && (
                  <>
                    <h3>Detalles de: {STATUS_LABELS[selectedStepDetails.raw_estado]}</h3>
                    <p><strong>Fecha y Hora:</strong> {new Date(selectedStepDetails.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
                    <p><strong>Ubicación:</strong> {selectedStepDetails.ubicacion}</p>
                    <p><strong>Descripción:</strong> {selectedStepDetails.descripcion || 'Sin descripción adicional.'}</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="status-error">Error: {error}</p>}
    </div>
  );
}