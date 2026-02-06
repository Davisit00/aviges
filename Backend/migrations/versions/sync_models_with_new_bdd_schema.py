"""sync models with new BDD schema

Revision ID: sync_new_schema_2026
Revises: b1c29528606b
Create Date: 2026-02-06

This migration updates the database schema to match the new BDD/AVIGESBDD.sql schema.
Major changes:
1. Rename fields: eliminado -> is_deleted, fecha_registro -> created_at
2. Add new tables: Direcciones, Personas, Telefonos, Ubicaciones, Asignaciones, Lotes
3. Add new journey tables: Viajes_tiempos, Viajes_conteos, Viajes_origen, Estadisticas
4. Restructure existing tables to reference new base tables

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision = 'sync_new_schema_2026'
down_revision = 'b1c29528606b'
branch_labels = None
depends_on = None


def upgrade():
    """
    This is a complex migration that restructures the entire database.
    
    IMPORTANT: This migration assumes the database will be recreated from scratch
    using the new BDD/AVIGESBDD.sql schema. Manual data migration may be required.
    
    Steps:
    1. Create new base tables (Direcciones, Personas, Telefonos)
    2. Create Ubicaciones table
    3. Modify existing tables to use new field names
    4. Add new tables for the journey tracking system
    """
    
    # Step 1: Create new base tables
    
    # Direcciones table
    op.create_table('Direcciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pais', sa.String(length=100), nullable=False),
        sa.Column('estado', sa.String(length=100), nullable=False),
        sa.Column('municipio', sa.String(length=100), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Personas table
    op.create_table('Personas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_direcciones', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('apellido', sa.String(length=100), nullable=False),
        sa.Column('cedula', sa.String(length=20), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_direcciones'], ['Direcciones.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cedula')
    )
    
    # Telefonos table
    op.create_table('Telefonos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_personas', sa.Integer(), nullable=False),
        sa.Column('numero', sa.String(length=20), nullable=False),
        sa.Column('estado', sa.String(length=255), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.CheckConstraint("estado IN ('Celular', 'Casa', 'Trabajo')"),
        sa.ForeignKeyConstraint(['id_personas'], ['Personas.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Ubicaciones table
    op.create_table('Ubicaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_direcciones', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('tipo', sa.String(length=255), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.CheckConstraint("tipo IN ('Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen')"),
        sa.ForeignKeyConstraint(['id_direcciones'], ['Direcciones.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Step 2: Modify Roles table
    op.alter_column('Roles', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Roles', 'fecha_registro', new_column_name='created_at')
    
    # Step 3: Restructure Empresas_Transporte table
    # Add new columns
    op.add_column('Empresas_Transporte', sa.Column('id_direcciones', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_empresas_transporte_direcciones', 'Empresas_Transporte', 'Direcciones', ['id_direcciones'], ['id'])
    # Rename table
    op.rename_table('Empresas_Transporte', 'Empresas_transportes')
    # Rename columns
    op.alter_column('Empresas_transportes', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Empresas_transportes', 'fecha_registro', new_column_name='created_at')
    
    # Step 4: Restructure Granjas table
    # Add new column
    op.add_column('Granjas', sa.Column('id_ubicaciones', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_granjas_ubicaciones', 'Granjas', 'Ubicaciones', ['id_ubicaciones'], ['id'])
    # Drop old columns (after data migration)
    # op.drop_column('Granjas', 'nombre')
    # op.drop_column('Granjas', 'direccion')
    # op.drop_column('Granjas', 'dueno')
    # Rename columns
    op.alter_column('Granjas', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Granjas', 'fecha_registro', new_column_name='created_at')
    
    # Step 5: Modify Productos table
    # Remove old columns (after ensuring data is migrated)
    # op.drop_column('Productos', 'codigo')
    # op.drop_column('Productos', 'es_ave_viva')
    # Rename columns
    op.alter_column('Productos', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Productos', 'fecha_registro', new_column_name='created_at')
    
    # Step 6: Modify Galpones table
    # Rename codigo to nro_galpon
    op.alter_column('Galpones', 'codigo', new_column_name='nro_galpon')
    # Rename columns
    op.alter_column('Galpones', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Galpones', 'fecha_registro', new_column_name='created_at')
    
    # Step 7: Create Lotes table
    op.create_table('Lotes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_galpones', sa.Integer(), nullable=False),
        sa.Column('codigo_lote', sa.String(length=50), nullable=False),
        sa.Column('fecha_alojamiento', sa.Date(), nullable=False),
        sa.Column('cantidad_aves', sa.Integer(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_galpones'], ['Galpones.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Step 8: Restructure Vehiculos table
    # Rename foreign key column
    op.alter_column('Vehiculos', 'id_empresa_transporte', new_column_name='id_empresas_transportes')
    # Drop old columns
    # op.drop_column('Vehiculos', 'descripcion')
    # op.drop_column('Vehiculos', 'peso_tara')
    # Rename columns
    op.alter_column('Vehiculos', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Vehiculos', 'fecha_registro', new_column_name='created_at')
    
    # Step 9: Restructure Choferes table
    # Add new column
    op.add_column('Choferes', sa.Column('id_personas', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_choferes_personas', 'Choferes', 'Personas', ['id_personas'], ['id'])
    # Rename foreign key column
    op.alter_column('Choferes', 'id_empresa_transporte', new_column_name='id_empresas_transportes')
    # Drop old columns (after data migration)
    # op.drop_column('Choferes', 'cedula')
    # op.drop_column('Choferes', 'nombre')
    # op.drop_column('Choferes', 'apellido')
    # Rename columns
    op.alter_column('Choferes', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Choferes', 'fecha_registro', new_column_name='created_at')
    
    # Step 10: Create Asignaciones table
    op.create_table('Asignaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_vehiculos', sa.Integer(), nullable=False),
        sa.Column('id_chofer', sa.Integer(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('hora', sa.Time(), nullable=False),
        sa.Column('active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_vehiculos'], ['Vehiculos.id']),
        sa.ForeignKeyConstraint(['id_chofer'], ['Choferes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Step 11: Restructure Usuarios table
    # Add new columns
    op.add_column('Usuarios', sa.Column('id_personas', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_usuarios_personas', 'Usuarios', 'Personas', ['id_personas'], ['id'])
    # Rename columns
    op.alter_column('Usuarios', 'nombre_usuario', new_column_name='usuario')
    op.alter_column('Usuarios', 'contrasena_hash', new_column_name='contraseña')
    op.alter_column('Usuarios', 'id_rol', new_column_name='id_roles')
    op.alter_column('Usuarios', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Usuarios', 'fecha_registro', new_column_name='created_at')
    # Drop old columns (after data migration)
    # op.drop_column('Usuarios', 'nombre')
    # op.drop_column('Usuarios', 'apellido')
    
    # Step 12: Restructure Tickets_Pesaje table
    # Rename table
    op.rename_table('Tickets_Pesaje', 'Ticket_pesaje')
    # Add new columns
    op.add_column('Ticket_pesaje', sa.Column('id_asignaciones', sa.Integer(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('id_usuarios_primer_peso', sa.Integer(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('id_usuarios_segundo_peso', sa.Integer(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('id_origen', sa.Integer(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('id_destino', sa.Integer(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('fecha_primer_peso', sa.DateTime(), nullable=True))
    op.add_column('Ticket_pesaje', sa.Column('fecha_segundo_peso', sa.DateTime(), nullable=True))
    # Create foreign keys
    op.create_foreign_key('fk_ticket_asignaciones', 'Ticket_pesaje', 'Asignaciones', ['id_asignaciones'], ['id'])
    op.create_foreign_key('fk_ticket_usuario_primer', 'Ticket_pesaje', 'Usuarios', ['id_usuarios_primer_peso'], ['id'])
    op.create_foreign_key('fk_ticket_usuario_segundo', 'Ticket_pesaje', 'Usuarios', ['id_usuarios_segundo_peso'], ['id'])
    op.create_foreign_key('fk_ticket_origen', 'Ticket_pesaje', 'Ubicaciones', ['id_origen'], ['id'])
    op.create_foreign_key('fk_ticket_destino', 'Ticket_pesaje', 'Ubicaciones', ['id_destino'], ['id'])
    # Rename columns
    op.alter_column('Ticket_pesaje', 'tipo_proceso', new_column_name='tipo')
    op.alter_column('Ticket_pesaje', 'eliminado', new_column_name='is_deleted')
    op.alter_column('Ticket_pesaje', 'fecha_registro', new_column_name='created_at')
    # Drop old columns (after data migration)
    # op.drop_column('Ticket_pesaje', 'id_vehiculo')
    # op.drop_column('Ticket_pesaje', 'id_chofer')
    # op.drop_column('Ticket_pesaje', 'id_usuario')
    # op.drop_column('Ticket_pesaje', 'peso_avisado')
    # op.drop_column('Ticket_pesaje', 'cantidad_cestas')
    
    # Step 13: Create journey tracking tables
    
    # Viajes_tiempos table
    op.create_table('Viajes_tiempos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_ticket', sa.Integer(), nullable=False),
        sa.Column('hora_salida_granja', sa.DateTime(), nullable=True),
        sa.Column('hora_inicio_descarga', sa.DateTime(), nullable=True),
        sa.Column('hora_fin_descarga', sa.DateTime(), nullable=True),
        sa.Column('tiempo_transito', sa.Integer(), nullable=True),
        sa.Column('tiempo_espera', sa.Integer(), nullable=True),
        sa.Column('tiempo_operacion', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_ticket'], ['Ticket_pesaje.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Viajes_conteos table
    op.create_table('Viajes_conteos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_ticket', sa.Integer(), nullable=False),
        sa.Column('aves_guia', sa.Integer(), nullable=False),
        sa.Column('aves_recibidas', sa.Integer(), nullable=True),
        sa.Column('aves_faltantes', sa.Integer(), nullable=True),
        sa.Column('aves_aho', sa.Integer(), nullable=True),
        sa.Column('numero_de_jaulas', sa.Integer(), nullable=False),
        sa.Column('peso_promedio_jaulas', sa.Numeric(10, 2), nullable=True),
        sa.Column('aves_por_jaula', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_ticket'], ['Ticket_pesaje.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Viajes_origen table
    op.create_table('Viajes_origen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_ticket', sa.Integer(), nullable=False),
        sa.Column('id_lote', sa.Integer(), nullable=False),
        sa.Column('numero_de_orden', sa.String(length=50), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_ticket'], ['Ticket_pesaje.id']),
        sa.ForeignKeyConstraint(['id_lote'], ['Lotes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Estadisticas table
    op.create_table('Estadisticas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_ticket', sa.Integer(), nullable=False),
        sa.Column('porcentaje_aves_faltantes', sa.Float(), nullable=True),
        sa.Column('porcentaje_aves_ahogadas', sa.Float(), nullable=True),
        sa.Column('peso_promedio_aves', sa.Float(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('getdate()'), nullable=False),
        sa.ForeignKeyConstraint(['id_ticket'], ['Ticket_pesaje.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Step 14: Drop old Detalles_Transporte_Aves table (after data migration)
    # op.drop_table('Detalles_Transporte_Aves')


def downgrade():
    """
    Downgrade is complex and may result in data loss.
    It's recommended to backup the database before downgrading.
    """
    # This is a destructive downgrade - only implement if necessary
    # For now, we'll leave it as a placeholder
    pass
