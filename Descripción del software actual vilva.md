## Descripción del software actual:

Software actual posee, login (autenticación), mantenimiento (datos: Productos, vehículos y choferes), procesos (Registrar pesadas de la maquina entrada y/o salida de mercancía), reportes (Reimpresión de tickets/documentos emitidos por el software y Relación de pesadas(? (Discutir con Argemiro, según es un reporte de todas las pesadas entre dos fechas)).

Datos que utiliza el software actual:

1\. Para insertar un producto requiere: Código y nombre.

2\. Para insertar un vehículo requiere: Placa y Descripción del vehículo (Lo que transporta normalmente, ej: Aves vivas, Aves beneficiadas, hielo, vísceras, etc.).

3\. Para insertar un chofer requiere: Cédula y nombre.

4\. Para registrar una entrada o una salida de mercancía requiere: Tipo de proceso (Entrada o Salida), Placa del vehículo, la cédula del chofer, la cantidad de cestas, Peso avisado, Código del producto, y el peso bruto (Sale de la maquina, **_no se coloca manualmente_**).

5\. Para reimprimir un ticket/documento requiere: Nro. Documento/Ticket.

6\. Para la relación de pesadas requiere: la fecha inicial, la final, si es resumido o todos los movimientos y el nombre que utilizará el archivo.

## Descripción de datos guardados en los formatos de excel:

Para empezar, en el excel hay dos formatos, uno que guarda datos mas exactos del transporte de la mercancía y de donde vienen los transportes (ej: Que empresa hace el transporte, nombre del chofer entre otros datos) y otro que guarda datos de las entradas (No estoy seguro si salidas también, **_PREGUNTAR_**)

Datos que requiere el formato de transporte (Formato Nro. 1):

Todo va dentro de la granja por lo tanto lleva el nombre de la granja, es decir que el formato/tabla debe ser llenado con todos los transportes que se han hecho para esa granja, se realiza diariamente:

- Quien transporta (Empresa).
- Nombre del chofer.
- Placa del vehículo.
- Nro. De orden (Identificador unico).
- Galpón.
- Lote.
- Cantidad total de aves.
- Peso neto.
- Peso promedio.

Datos que requiere el formato de entradas (Formato Nro. 2):

- Placa del vehículo.
- Chofer del vehículo.
- Hora de salida de la granja.
- Hora de entrada a la romana.
- Tiempo recorrido (desde la granja a la romana).
- Hora de inicio (del despacho?).
- Tiempo de espera (para despachar?)..
- Nombre de la granja a la que pertenece.
- Cantidad de aves transportadas.
- Cantidad de aves contadas.
- Cantidad de aves faltantes o sobrantes.
- Porcentaje (%) de aves sobrantes o faltantes.
- Peso neto de las aves transportadas en Kgs.
- Peso promedio de las aves.
- Aves AHO (Aves ahogadas?).
- % de aves AHO.
- Cantidad o Nro. de jaulas/guacales(Cantidad de jaulas?).
- Cantidad de aves por jaula/guacal.
- Galpon.
- Edad de las aves en dias.
- Cantidad de aves confirmadas o conteo final de aves

Despues de analizar, se concluye que este formato lleva el control diario de las entradas de aves vivas

El romanero registra una entrada, luego esa entrada queda en espera para registrar el peso tara
El romanero registra una salida, luego esa salida queda en espera para registrar el peso bruto
Los formatos se llenan manualmente con el numero de orden
