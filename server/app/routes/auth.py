from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity

api = Namespace('auth', description='Authentication operations')

#----------------------------------------------login_model for input------------------------------------------------

# Model for input validation
login_model = api.model('Login', {
    'email': fields.String(required=True, description='User email'),
    'password': fields.String(required=True, description='User password')
})

register_model = api.model('Register', {
    'email': fields.String(required=True, description='User email'),
    'username': fields.String(required=True, description='Username'), # Nouveau champ
    'password': fields.String(required=True, description='User password')
})

#----------------------------------------------register endpoint------------------------------------------------

@api.route('/register')
class Register(Resource):
    @api.expect(register_model)
    def post(self):
        """Register a new user"""
        data = api.payload
        
        # Vérifier si l'email existe déjà
        if facade.get_user_by_email(data['email']):
            return {'error': 'Email already registered'}, 400
            
        # Vérifier si le nom d'utilisateur existe déjà
        if facade.get_user_by_username(data['username']):
            return {'error': 'Username already taken'}, 400
            
        try:
            user = facade.create_user({
                'email': data['email'], 
                'username': data['username'],
                'password': data['password']
            })
        except ValueError as e:
            return {'error': str(e)}, 400
        return {'message': 'User registered successfully'}, 201

#----------------------------------------------login endpoint------------------------------------------------

@api.route('/login')
class Login(Resource):

#----------------------------------------------post method to log in properly (return an access token)------------------------------------------------
    @api.expect(login_model)
    def post(self):
        """Authenticate user and return a JWT token"""
        credentials = api.payload  # Get the email and password from the request payload
        
        # Step 1: Retrieve the user based on the provided email
        user = facade.get_user_by_email(credentials['email'])
        
        # Step 2: Check if the user exists and the password is correct
        if not user or not user.verify_password(credentials['password']):
            return {'error': 'Invalid credentials'}, 401

        # Step 3: Create a JWT token with the user's id and is_admin flag
        access_token = create_access_token(identity={'id': str(user.id)})
        
        # Step 4: Return the JWT token to the client
        return {'access_token': access_token}, 200
