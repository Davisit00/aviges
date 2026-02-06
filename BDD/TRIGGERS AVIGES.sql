-- Trigger para realizar la operación de sincronización de la hora de llegada a romana en la tabla Viajes_tiempos
CREATE TRIGGER TR_SyncLlegadaTiempos
ON Ticket_pesaje
AFTER INSERT, UPDATE
AS
BEGIN
    UPDATE vt
    SET vt.hora_llegada_romana = i.fecha_primer_peso
    FROM Viajes_tiempos vt
    INNER JOIN inserted i ON vt.id_ticket = i.id;
END;

-- Trigger para generar estadísticas al finalizar un ticket de pesaje
CREATE TRIGGER TR_GenerarEstadisticas
ON Ticket_pesaje
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- Solo actuar si el ticket se marca como 'Finalizado'
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON i.id = d.id 
               WHERE i.estado = 'Finalizado' AND d.estado <> 'Finalizado')
    BEGIN
        INSERT INTO Estadisticas (id_ticket, porcentaje_aves_faltantes, porcentaje_aves_ahogadas, peso_promedio_aves)
        SELECT 
            i.id,
            (CAST(vc.aves_faltantes AS FLOAT) / NULLIF(vc.aves_guia, 0)) * 100,
            (CAST(vc.aves_aho AS FLOAT) / NULLIF(vc.aves_recibidas, 0)) * 100,
            (i.peso_neto / NULLIF(vc.aves_recibidas, 0))
        FROM inserted i
        JOIN Viajes_conteos vc ON i.id = vc.id_ticket
        -- Evita duplicados si se re-finaliza
        WHERE NOT EXISTS (SELECT 1 FROM Estadisticas e WHERE e.id_ticket = i.id);
    END
END;