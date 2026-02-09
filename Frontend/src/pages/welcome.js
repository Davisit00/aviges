export const WelcomeInterface = {
  template: `
    <style>
      .welcome-container {
        padding: 40px;
        max-width: 1000px;
        margin: 0 auto;
        font-family: 'Helvetica', sans-serif;
        color: #333;
        animation: fadeIn 0.5s ease-in;
      }
      .welcome-header {
        text-align: center;
        margin-bottom: 50px;
      }
      .welcome-header h1 {
        font-size: 2.5rem;
        color: #003B73;
        margin-bottom: 10px;
      }
      .welcome-header p {
        font-size: 1.2rem;
        color: #666;
      }
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
      }
      .info-card {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        border-left: 5px solid transparent;
        transition: transform 0.2s;
      }
      .info-card:hover {
        transform: translateY(-5px);
      }
      .info-card h2 {
        margin-top: 0;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .info-card p {
        line-height: 1.6;
        color: #555;
      }
      .card-mantenimiento { border-left-color: #FFB801; }
      .card-procesos { border-left-color: #003B73; }
      .card-reportes { border-left-color: #ED1C24; }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>

    <div class="welcome-container">
      <div class="welcome-header">
        <h1>Bienvenido a Aviges</h1>
        <p>Sistema de Control y Pesaje Vehicular</p>
        <div style="margin-top: 20px; font-style: italic; font-size: 0.9em; color: #888;">
          Seleccione una opción del menú lateral para comenzar.
        </div>
      </div>

      <div class="cards-grid">
        
        <!-- Tarjeta Procesos (Lo más importante) -->
        <div class="info-card card-procesos">
          <h2 style="color: #003B73;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fill="#003B73" fill-rule="evenodd" d="M3 3a3 3 0 0 0-3 3v9c0 1.312.842 2.427 2.016 2.835A3.5 3.5 0 0 0 8.965 18h6.07a3.501 3.501 0 0 0 6.95-.165A3 3 0 0 0 24 15v-4.248a3 3 0 0 0-.742-1.976L20.85 6.024A3 3 0 0 0 18.592 5H16.83A3 3 0 0 0 14 3zm1 14.436v.128a1.501 1.501 0 0 0 3 0v-.128a1.501 1.501 0 0 0-3 0M5.5 14a3.5 3.5 0 0 1 3.163 2h6.674a3.5 3.5 0 0 1 6.235-.18A1 1 0 0 0 22 15v-4h-5a2 2 0 0 1-2-2V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v9c0 .34.17.64.428.82A3.5 3.5 0 0 1 5.5 14M17 7v1a1 1 0 0 0 1 1h2.796l-1.451-1.659A1 1 0 0 0 18.593 7zm0 10.436v.128a1.501 1.501 0 0 0 3 0v-.128a1.501 1.501 0 0 0-3 0" clip-rule="evenodd"/></svg> Procesos</h2>
          <p>
            <strong>¿Qué hago aquí?</strong><br>
            Esta es la parte principal del sistema. Aquí es donde realizas el trabajo diario.
          </p>
          <ul style="padding-left: 20px; color: #555;">
            <li>Registrar la <strong>entrada</strong> de camiones llenos.</li>
            <li>Registrar la <strong>salida</strong> de camiones vacíos.</li>
            <li>Obtener el peso de la balanza automáticamente.</li>
            <li>Generar el ticket de pesaje.</li>
          </ul>
        </div>

        <!-- Tarjeta Mantenimiento -->
        <div class="info-card card-mantenimiento">
          <h2 style="color: #FFB801;"><svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        stroke="currentColor"
                                                        stroke-width="1.5"
                                                        stroke-width="1.5"
                                                        style="display: block; width: 28px; height: 28px;"
                                                        fill="none"
                                                        viewBox="0 0 24 24"><path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3 3 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008z" /></svg> Mantenimiento</h2>
          <p>
            <strong>¿Qué hago aquí?</strong><br>
            Aquí registras la información que no cambia seguido, para no tener que escribirla cada vez que pesas un camión.
          </p>
          <p>
            Sirve para guardar:
            <br>• Nombres de choferes.
            <br>• Placas de vehículos.
            <br>• Tipos de productos.
            <br>• Datos de granjas o empresas.
          </p>
        </div>

        <!-- Tarjeta Reportes -->
        <div class="info-card card-reportes">
          <h2 style="color: #ED1C24;">
          <svg
                style="width: 28px; height: 28px;"
                xmlns="http://www.w3.org/2000/svg"
                id="icon"
                viewBox="0 0 32 32"
                fill="currentColor"><path
                d="M15 20h2v4h-2zm5-2h2v6h-2zm-10-4h2v10h-2z" /><path
                d="M25 5h-3V4a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v1H7a2 2 0 0 0-2 2v21a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M12 4h8v4h-8Zm13 24H7V7h3v3h12V7h3Z" /><path
                id="_Transparent_Rectangle_"
                d="M0 0h32v32H0z"
                data-name="&lt;Transparent Rectangle&gt;"
                style="fill:none" /></svg>
          Reportes</h2>
          <p>
            <strong>¿Qué hago aquí?</strong><br>
            Esta sección funciona como el historial o la biblioteca de archivos.
          </p>
          <ul style="padding-left: 20px; color: #555;">
            <li>Buscar tickets antiguos por fecha o placa.</li>
            <li>Volver a imprimir un ticket si se perdió.</li>
            <li>Ver el listado completo de pesajes realizados.</li>
          </ul>
        </div>

      </div>
    </div>
  `,
  setup() {
    // No requiere lógica compleja, es solo informativa
    console.log("Welcome page loaded");
  },
};
