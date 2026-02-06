-- Insertar Rol Admin si no existe
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre = 'admin')
BEGIN
    INSERT INTO Roles (nombre, is_deleted, created_at)
    VALUES ('admin', 0, GETDATE());
END

-- Insertar Rol Romanero si no existe
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre = 'romanero')
BEGIN
    INSERT INTO Roles (nombre, is_deleted, created_at)
    VALUES ('romanero', 0, GETDATE());
END