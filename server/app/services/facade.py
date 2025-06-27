from app.persistence.repository import InMemoryRepository, SQLAlchemyRepository, UserRepository
from app.models.user import User
from app.models.progress import Progress
from app.models.question import Question
from app import db

#-----------------------------------JumpAndLearnFacade-----------------------------------

class JumpAndLearnFacade:
    def __init__(self):
        self.user_repo = UserRepository()

#-----------------------------------create_user-----------------------------------
    
    def create_user(self, user_data):
        user = User(**user_data)
        user.hash_password(user_data['password'])
        self.user_repo.add(user)
        return user

#-----------------------------------get_user-----------------------------------

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

#-----------------------------------get_user_by_email-----------------------------------

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute('email', email)

#-----------------------------------get_user_by_username-----------------------------------

    def get_user_by_username(self, username):
        return self.user_repo.get_by_attribute('username', username)

#-----------------------------------get_all_users-----------------------------------

    def get_all_users(self):
        return self.user_repo.get_all()

#-----------------------------------update_user-----------------------------------

    def update_user(self, user_id, **user_data):
        """Update user in repository"""
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        updates = {}
        for field, value in user_data.items():
            if hasattr(user, field):
                updates[field] = value

        updated_user = self.user_repo.update(user_id, updates)

        if updated_user is None:
            updated_user = self.get_user(user_id)

        return updated_user
    
    def get_progress_by_user_id(self, user_id):
        """Get progress by user ID"""
        return db.session.query(Progress).filter_by(user_id=user_id).first()
    
    def update_progress(self, user_id, level):
        """Update or create progress for a user"""
        progress = self.get_progress_by_user_id(user_id)
        if not progress:
            progress = Progress(user_id=user_id, level=level)
            db.session.add(progress)
        else:
            progress.level = level
        db.session.commit()
        return progress

#-----------------------------------get_question_by_id-----------------------------------

    def get_question_by_id(self, question_id):
        return db.session.query(Question).get(question_id)
    
    def get_all_questions(self):
        return db.session.query(Question).all()
