

## 🚀 Características y Avances
- **Interfaz por Categorías (Tabs):** Organización de artefactos por pestañas (Línea Blanca, Entretención, Iluminación, etc.).
- **Cálculo Dinámico:** Medidor e indicadores en tiempo real de kWh/mes.
- **Integración MVP:** Conectado con la API REST (`/api/analisis-energetico`).
- **QA & UX:** Validaciones y mensajes de error traducidos al español, reseteo completo para nuevos cálculos y vista de impresión para boleta/reporte.

## 🛠️ Tecnologías
- **Backend:** Python (Flask), LangChain.
- **Frontend:** HTML5, CSS3, JavaScript (ES6+).

## ⚙️ Ejecución Local

1. Activar el entorno virtual e instalar dependencias:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt