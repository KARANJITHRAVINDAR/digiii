"""m3_production_schema

Revision ID: 0004_m3_production_schema
Revises: 0003_complete_m2_schema
Create Date: 2026-09-29 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004_m3_production_schema'
down_revision: Union[str, None] = '0003_complete_m2_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create email_outbox table
    op.create_table(
        'email_outbox',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipient_email', sa.String(length=120), nullable=False),
        sa.Column('recipient_user_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'SENT', 'FAILED', name='emailstatus'), nullable=False, server_default='PENDING'),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['recipient_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_outbox_id'), 'email_outbox', ['id'], unique=False)
    op.create_index(op.f('ix_email_outbox_recipient_email'), 'email_outbox', ['recipient_email'], unique=False)
    op.create_index(op.f('ix_email_outbox_status'), 'email_outbox', ['status'], unique=False)

    # 2. Make dispute_id nullable in dispute_events
    op.alter_column('dispute_events', 'dispute_id',
        existing_type=sa.Integer(),
        nullable=True
    )


def downgrade() -> None:
    op.drop_table('email_outbox')
