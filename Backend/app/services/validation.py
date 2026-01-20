from sqlalchemy import Integer, String, Boolean, Numeric, DateTime

def validate_payload(model, data: dict, partial: bool = False):
    cols = {c.name: c for c in model.__table__.columns}
    unknown = set(data.keys()) - set(cols.keys())
    if unknown:
        return False, f"Campos desconocidos: {', '.join(sorted(unknown))}"

    required = []
    for c in cols.values():
        if c.primary_key or c.autoincrement:
            continue
        if c.nullable:
            continue
        if c.default is not None or c.server_default is not None or c.computed is not None:
            continue
        required.append(c.name)

    if not partial:
        missing = [r for r in required if r not in data]
        if missing:
            return False, f"Faltan campos requeridos: {', '.join(missing)}"

    # Validación de tipos básica
    for k, v in data.items():
        if v is None:
            continue
        col = cols[k]
        t = col.type
        if isinstance(t, Integer) and not isinstance(v, int):
            return False, f"'{k}' debe ser entero"
        if isinstance(t, Boolean) and not isinstance(v, bool):
            return False, f"'{k}' debe ser booleano"
        if isinstance(t, Numeric) and not isinstance(v, (int, float)):
            return False, f"'{k}' debe ser numérico"
        if isinstance(t, String) and not isinstance(v, str):
            return False, f"'{k}' debe ser string"
        if isinstance(t, DateTime) and not isinstance(v, str):
            # se acepta ISO string por simplicidad
            return False, f"'{k}' debe ser string ISO datetime"
    return True, None