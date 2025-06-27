from app import create_app, db
from app.models.question import Question

app = create_app()

with app.app_context():
    q1 = Question(
        text="Quelle est la capitale de la France ?",
        choice1="Paris",
        choice2="Lyon",
        choice3="Marseille",
        correct=0
    )
    q2 = Question(
        text="Combien vaudra la variable d à la fin de ce programme ? a=3 b=a-5 c=b-3 d=c-4",
        choice1="0",
        choice2="-9",
        choice3="-3",
        correct=1
    )
    q3 = Question(
        text="Comment print un entier en C ?",
        choice1="printf(\"%d\")",
        choice2="printf(\"%c\")",
        choice3="printf(\"%s\")",
        correct=0
    )
    db.session.add_all([q1, q2, q3])
    db.session.commit()
    print("Questions ajoutées !")