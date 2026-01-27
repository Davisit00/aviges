import serial
import time
import random
import sys

# Configuración del puerto EMISOR
PORT = 'COM1' 
BAUD_RATE = 9600

def simular_balanza():
    try:
        print(f"--- SIMULADOR DE BALANZA ---")
        print(f"Intentando abrir {PORT} para enviar datos...")
        
        # Abrimos el puerto
        ser = serial.Serial(PORT, BAUD_RATE, timeout=1)
        print(f"Conectado exitosamente a {PORT}")
        print("Enviando datos aleatorios. Presiona Ctrl+C para detener.\n")

        while True:
            # 1. Generar peso aleatorio (ej. entre 100.00 y 5000.00 kg)
            peso = round(random.uniform(100.0, 5000.0), 2)
            
            # 2. Formatear el mensaje
            # Es importante agregar \n (salto de línea) o \r\n para que 
            # el lector sepa cuándo termina el dato.
            mensaje = f"{peso}\n"
            
            # 3. Enviar bytes
            ser.write(mensaje.encode('utf-8'))
            
            print(f"TX -> {mensaje.strip()}")
            
            # 4. Esperar un poco antes del siguiente envío
            time.sleep(2)

    except serial.SerialException as e:
        print(f"\n[ERROR] No se pudo abrir el puerto {PORT}.")
        print(f"Detalle: {e}")
        print("Verifica que el puerto exista en com0com y no esté siendo usado por otro programa.")
    except KeyboardInterrupt:
        print("\n\nSimulación detenida.")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Puerto cerrado.")

if __name__ == "__main__":
    simular_balanza()