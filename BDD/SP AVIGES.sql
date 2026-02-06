CREATE PROCEDURE SP_FinalizarTicketPesaje
    @TicketID INT,
    @SegundoPeso DECIMAL(10,2),
    @UsuarioID INT
AS
BEGIN
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Actualizar el ticket con el segundo peso (Tara)
        UPDATE Ticket_pesaje
        SET peso_tara = @SegundoPeso,
            id_usuarios_segundo_peso = @UsuarioID,
            fecha_segundo_peso = GETDATE(),
            estado = 'Finalizado'
        WHERE id = @TicketID;

        -- El trigger TR_GenerarEstadisticas se encargará del resto
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;