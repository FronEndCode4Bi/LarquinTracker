import { useState, useEffect } from 'preact/hooks';

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
  const [fillWidth, setFillWidth] = useState('0%');
  const [animatedNodes, setAnimatedNodes] = useState([false, false, false, false]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = event.target.elements.codigo.value;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedStepIndex(null);
    setFillWidth('0%');
    setAnimatedNodes([false, false, false, false]);
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

  // Selecciona por defecto el último estado alcanzado
  useEffect(() => {
    if (data && currentStepIndex >= 0) {
      setSelectedStepIndex(currentStepIndex);
      setFillWidth('0%');
      setAnimatedNodes([false, false, false, false]);
      setTimeout(() => {
        setFillWidth(`${(currentStepIndex <= 0 ? 0 : (currentStepIndex / (STATUS_ORDER.length - 1)) * 100)}%`);
        // Sincronizar animación de nodos con la barra
        const DURATION = 1000; // Duración de la animación de la barra en ms (1s)
        for (let i = 0; i <= currentStepIndex; i++) {
          const t = DURATION * (i / (STATUS_ORDER.length - 1));
          setTimeout(() => {
            setAnimatedNodes(prev => {
              const updated = [...prev];
              updated[i] = true;
              return updated;
            });
          }, t);
        }
      }, 100);
    }
  }, [data, currentStepIndex]);

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
    <>
      <div className="tracking-wrapper">
        <form onSubmit={handleSubmit} className="tracking-form">
          <div className="input-group">
            <input type="text" name="codigo" placeholder="Introduce tu código de seguimiento" required />
            <button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Rastrear'}
            </button>
          </div>
        </form>

        {loading && (
          <p className="status-loading">
            <span className="spinner"></span> Buscando...
          </p>
        )}
        
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
                  <div className="progress-bar-bg"></div>
                  <div className="progress-bar-fill" style={{ width: fillWidth }}></div>
                  {STATUS_ORDER.map((status, index) => (
                    <div key={status} className={`step ${index <= currentStepIndex ? 'completed' : ''} ${selectedStepIndex === index ? 'selected' : ''}`} onClick={() => handleStepClick(index)}>
                      <div className={`node${animatedNodes[index] ? ' node-animated' : ''}`}></div>
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

      <style>{`
        /* ANIMACIÓN PARA TRACKER-CARD */
        .tracker-card {
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: center bottom;
        }

        @keyframes slideInUp {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ANIMACIÓN PARA DETAIL-PANEL */
        .detail-panel {
          max-height: 0;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .detail-panel.visible {
          max-height: 300px;
          opacity: 1;
          transform: translateY(0);
        }

        /* Animaciones adicionales para mejor UX */
        .step {
          transition: transform 0.2s ease;
          transform-origin: center;
        }

        .node:hover {
          transform: scale(1.15);
        }

        .node {
          transition: all 0.3s ease;
          transform-origin: center;
          position: relative;
          z-index: 2;
        }

        .step.completed .node {
          /* La animación pulse solo se activa con la clase node-animated */
        }

        .step.selected .node {
          transform: scale(1.2);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
        }

        .node-animated {
          animation: pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          60% {
            transform: scale(1.3);
            box-shadow: 0 0 0 18px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .line {
          transition: background-color 0.5s ease;
        }

        .label-step {
          transition: all 0.3s ease;
        }

        .label-step:hover {
          transform: translateY(-2px);
        }

        .icon {
          transition: transform 0.3s ease;
        }

        .label-step:hover .icon {
          transform: scale(1.1);
        }

        /* Spinner animado para el estado de carga */
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid #d1d5db;
          border-top: 3px solid var(--color-primario);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .progress-bar-container {
          display: flex;
          gap: -10px;
          align-items: center;
          position: relative;
          margin: 32px 0 24px 0;
        }

        .progress-bar-bg {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          transform: translateY(-50%);
          z-index: 0;
        }

        .progress-bar-fill {
          position: absolute;
          top: 50%;
          left: 0;
          height: 6px;
          background: var(--color-primario);
          border-radius: 3px;
          transform: translateY(-50%);
          z-index: 1;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .node {
          transition: all 0.3s ease;
          transform-origin: center;
          position: relative;
          z-index: 2;
        }
      `}</style>
    </>
  );
}