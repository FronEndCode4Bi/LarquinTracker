import { useState } from 'preact/hooks';

// No cambian
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
  // --- ¡NUEVO ESTADO! Para guardar el índice del paso seleccionado ---
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = event.target.elements.codigo.value;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedStepIndex(null); // Reseteamos la selección en una nueva búsqueda
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

  // --- Lógica para la barra de progreso (sin cambios) ---
  let currentStepIndex = -1;
  let hasErrorState = false;
  // --- ¡NUEVO! Un mapa para acceder fácilmente a los detalles de cada estado ---
  const historyMap = new Map();

  if (data) {
    const latestStatusFromApi = data.historial[0]?.raw_estado;
    if (latestStatusFromApi === 'INCIDENCIA') {
      hasErrorState = true;
    } else {
      currentStepIndex = STATUS_ORDER.indexOf(latestStatusFromApi);
      // Llenamos el mapa con los datos del historial para un acceso rápido
      data.historial.forEach(item => {
        historyMap.set(item.raw_estado, item);
      });
    }
  }

  // --- ¡NUEVO! Función para manejar el clic en un paso ---
  const handleStepClick = (index) => {
    // No permitir seleccionar pasos futuros
    if (index > currentStepIndex) return;

    // Si se hace clic en el mismo paso, se deselecciona (efecto toggle)
    if (index === selectedStepIndex) {
      setSelectedStepIndex(null);
    } else {
      setSelectedStepIndex(index);
    }
  };

  // Obtenemos los detalles del paso seleccionado actualmente
  const selectedStepDetails = selectedStepIndex !== null 
    ? historyMap.get(STATUS_ORDER[selectedStepIndex]) 
    : null;

  return (
    <div className="tracking-wrapper">
      {/* El formulario no cambia */}
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
          {/* El header no cambia */}
          <div className="tracker-header">
            <div><span className="header-label">PEDIDO</span><span className="header-value">#{data.codigo}</span></div>
            <div><span className="header-label">Última Actualización</span><span className="header-value">{new Date(data.historial[0].fecha).toLocaleDateString('es-CO')}</span></div>
          </div>
          
          {hasErrorState ? (
            <div className="error-state-message">...</div>
          ) : (
            <>
              {/* Barra de Progreso - ¡AHORA CON CLICS! */}
              <div className="progress-bar-container">
                {STATUS_ORDER.map((status, index) => (
                  <div key={status} className={`step ${index <= currentStepIndex ? 'completed' : ''} ${selectedStepIndex === index ? 'selected' : ''}`} onClick={() => handleStepClick(index)}>
                    <div className="node"></div>
                    {index < STATUS_ORDER.length - 1 && <div className="line"></div>}
                  </div>
                ))}
              </div>

              {/* Etiquetas de Estado - ¡AHORA CON CLICS! */}
              <div className="status-labels">
                {STATUS_ORDER.map((status, index) => (
                  <div key={status} className={`label-step ${index <= currentStepIndex ? 'completed' : ''} ${selectedStepIndex === index ? 'selected' : ''}`} onClick={() => handleStepClick(index)}>
                    <div className="icon">{/* Iconos como antes */}</div>
                    <span>{STATUS_LABELS[status]}</span>
                  </div>
                ))}
              </div>

              {/* --- ¡NUEVO! Panel de Detalles --- */}
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