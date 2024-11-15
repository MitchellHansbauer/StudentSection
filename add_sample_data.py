from app import app
from models import db, User, Ticket, Listing, Transaction, APILog

with app.app_context():
    # Ensure tables are created
    db.create_all()

    # Create a test user
    user = User(
        first_name='Test',
        last_name='User',
        email='testuser@example.com',
        paciolan_account_id='123456789'
    )
    db.session.add(user)
    db.session.commit()
    print(f"User created with user_id: {user.user_id}")

    # Create a ticket
    ticket = Ticket(
        event_code='FB01',
        event_name='Football Game 1',
        season_code='FB17',
        section='A',
        row='1',
        seat_number='1',
        barcode='BARCODE123456',
        price=50.0,
        is_transferrable=True,
        owner_id=user.user_id
    )
    db.session.add(ticket)
    db.session.commit()
    print(f"Ticket created with ticket_id: {ticket.ticket_id}")

    # Create a listing
    listing = Listing(
        ticket_id=ticket.ticket_id,
        seller_id=user.user_id,
        price=60.0,
        status='Available'
    )
    db.session.add(listing)
    db.session.commit()
    print(f"Listing created with listing_id: {listing.listing_id}")
