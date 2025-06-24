from app.models.base import BaseModel
from sqlalchemy.ext.hybrid import hybrid_property
from flask_bcrypt import Bcrypt
from app import db

bcrypt = Bcrypt()

#-----------------------------------Progress Table Model-----------------------------------
class Progress(BaseModel):
    """Model class representing a user's progress"""
    __tablename__ = 'progress'
    
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    level = db.Column(db.Integer, nullable=False, default=1)
    completion_time = db.Column(db.Float, nullable=True)  # Time in milliseconds
    user = db.relationship('User', back_populates='progress')
