from ..db import db

class CRUDService:
    def __init__(self, model):
        self.model = model

    def get_all(self):
        return self.model.query.all()

    def get(self, id_):
        return self.model.query.get_or_404(id_)

    def create(self, data):
        obj = self.model(**data)
        db.session.add(obj)
        db.session.commit()
        return obj

    def update(self, id_, data):
        obj = self.get(id_)
        for k, v in data.items():
            setattr(obj, k, v)
        db.session.commit()
        return obj

    def delete(self, id_):
        obj = self.get(id_)
        db.session.delete(obj)
        db.session.commit()
        return obj