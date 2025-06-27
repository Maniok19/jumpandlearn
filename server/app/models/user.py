import re
from app.models.base import BaseModel
from sqlalchemy.ext.hybrid import hybrid_property
from flask_bcrypt import Bcrypt
from app import db

bcrypt = Bcrypt()
#-----------------------------------User Table Model-----------------------------------
class User(BaseModel):
    """Model class representing a user"""
    __tablename__ = 'users'
    _email = db.Column(db.String(120), nullable=False, unique=True)
    _username = db.Column(db.String(15), nullable=False, unique=True)  # Nouvelle colonne
    _password = db.Column(db.String(128), nullable=False)
    progress = db.relationship('Progress', back_populates='user', uselist=False)

#-----------------------------------function to hash password-----------------------------------

    def hash_password(self, password):
        """Hash the password using bcrypt"""
        return bcrypt.generate_password_hash(password).decode('utf-8')

#-----------------------------------function to verify password hashing-----------------------------------

    def verify_password(self, password):
        """Verify the password using bcrypt"""
        return bcrypt.check_password_hash(self._password, password)

#-----------------------------------email.getter-----------------------------------
    
    @hybrid_property
    def email(self):
        """Get the email of the user"""
        return self._email

#-----------------------------------email.setter-----------------------------------
    
    @email.setter
    def email(self, value):
        """Set the email of the user"""
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, value):
            raise ValueError("Invalid email address")
        self._email = value

#-----------------------------------username.getter-----------------------------------
    
    @hybrid_property
    def username(self):
        """Get the username of the user"""
        return self._username

#-----------------------------------username.setter-----------------------------------
    
    @username.setter
    def username(self, value):
        """Set the username of the user"""
        if not value:
            raise ValueError("Username cannot be empty")
        if len(value) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if len(value) > 15:
            raise ValueError("Username cannot be longer than 15 characters")
        # Vérifier que le nom d'utilisateur ne contient que des caractères autorisés
        pattern = r'^[a-zA-Z0-9_-]+$'
        if not re.match(pattern, value):
            raise ValueError("Username can only contain letters, numbers, underscores and hyphens")
        self._username = value

#-----------------------------------password.getter-----------------------------------

    @hybrid_property
    def password(self):
        """Get the hashed password of the user"""
        return self._password

#-----------------------------------password.setter-----------------------------------

    @password.setter
    def password(self, value):
        """Set the password of the user"""
        if not value:
            raise ValueError("Password cannot be empty")
        if len(value) < 6:
            raise ValueError("Password cannot be shorter than 6 characters")
        self._password = bcrypt.generate_password_hash(value).decode('utf-8')