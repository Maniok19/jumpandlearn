from app.services import facade
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import request
from app.models.progress import Progress
from app import db
from app.persistence.repository import SQLAlchemyRepository

api = Namespace('progress', description='Progress operations')

#----------------------------------------------progress_model for input------------------------------------------------

progress_model = api.model('Progress', {
    'level': fields.Integer(required=True, description='Level of the user'),
    'completion_time': fields.Float(required=False, description='Completion time in milliseconds')
})

#----------------------------------------------get user progress------------------------------------------------

@api.route('/')
class UserProgress(Resource):

    @jwt_required()
    def get(self):
        """Get the progress of the current user"""
        current_user = get_jwt_identity()
        user_id = current_user['id']
        
        # Retrieve the user's progress
        progress = facade.get_progress_by_user_id(user_id)
        
        if not progress:
            return {'message': 'No progress found for this user'}, 404
        
        return {
            'user_id': progress.user_id,
            'level': progress.level,
            'completion_time': progress.completion_time
        }, 200

#----------------------------------------------update user progress------------------------------------------------

    @jwt_required()
    @api.expect(progress_model)
    def post(self):
        """Update the progress of the current user"""
        current_user = get_jwt_identity()
        user_id = current_user['id']
        data = api.payload
        level = data.get('level')
        completion_time = data.get('completion_time')

        progress = facade.get_progress_by_user_id(user_id)
        if not progress:
            # Create new progress entry
            progress = Progress(user_id=user_id, level=level, completion_time=completion_time)
            db.session.add(progress)
        else:
            # Update level (always update to highest level reached)
            if level > progress.level:
                progress.level = level
            
            # Only update completion time if it's better (lower) than the current record
            if completion_time is not None:
                if progress.completion_time is None or completion_time < progress.completion_time:
                    progress.completion_time = completion_time
                    completion_time_updated = True
                else:
                    completion_time_updated = False
            else:
                completion_time_updated = False
        
        db.session.commit()
        
        # Prepare response message
        response_message = 'Progress updated'
        if completion_time is not None and 'completion_time_updated' in locals():
            if completion_time_updated:
                response_message += ' - New best time!'
            else:
                response_message += ' - Time not improved'
        
        return {
            'message': response_message, 
            'level': progress.level,
            'completion_time': progress.completion_time
        }, 200

#----------------------------------------------get leaderboard------------------------------------------------

@api.route('/leaderboard')
class Leaderboard(Resource):
    
    def get(self):
        """Get leaderboard with best completion times"""
        # Get all progress records with completion times, ordered by time
        progress_records = db.session.query(Progress).filter(
            Progress.completion_time.isnot(None)
        ).order_by(Progress.completion_time.asc()).limit(10).all()
        
        leaderboard = []
        for progress in progress_records:
            user = facade.get_user(progress.user_id)
            leaderboard.append({
                'username': user.username if user else 'Unknown', # Changé de user_email à username
                'level': progress.level,
                'completion_time': progress.completion_time
            })
        
        return {'leaderboard': leaderboard}, 200
