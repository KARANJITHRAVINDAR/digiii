"""complete_m2_schema

Revision ID: 0003_complete_m2_schema
Revises: 0002_attendance_and_disputes
Create Date: 2026-09-29 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003_complete_m2_schema'
down_revision: Union[str, None] = '0002_attendance_and_disputes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create attendance_sessions
    op.create_table(
        'attendance_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('session_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('status', sa.Enum('SCHEDULED', 'COMPLETED', 'CANCELLED', name='sessionstatus'), nullable=False, server_default='COMPLETED'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attendance_sessions_course_id'), 'attendance_sessions', ['course_id'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_id'), 'attendance_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_session_date'), 'attendance_sessions', ['session_date'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_teacher_id'), 'attendance_sessions', ['teacher_id'], unique=False)

    # 2. Add session_id to attendance_records
    op.add_column('attendance_records', sa.Column('session_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_attendance_records_session_id'), 'attendance_records', ['session_id'], unique=False)
    op.create_foreign_key('fk_attendance_records_session_id', 'attendance_records', 'attendance_sessions', ['session_id'], ['id'])

    # 3. Add columns to disputes
    op.add_column('disputes', sa.Column('teacher_id', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('disputes', sa.Column('resolution_remarks', sa.Text(), nullable=True))
    op.add_column('disputes', sa.Column('due_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')))
    op.create_index(op.f('ix_disputes_due_at'), 'disputes', ['due_at'], unique=False)
    op.create_index(op.f('ix_disputes_teacher_id'), 'disputes', ['teacher_id'], unique=False)
    op.create_foreign_key('fk_disputes_teacher_id', 'disputes', 'users', ['teacher_id'], ['id'])

    # Update enum for disputes.status to include ESCALATED_TO_HOD and ESCALATED_TO_ADMIN
    # (Note: In MySQL Enum ALTER, we alter table column definition)
    op.alter_column('disputes', 'status',
        type_=sa.Enum('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN', name='disputestatus'),
        nullable=False,
        server_default='OPEN'
    )

    # 4. Add columns to dispute_events
    op.add_column('dispute_events', sa.Column('previous_status', sa.Enum('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN', name='disputestatus'), nullable=True))
    op.add_column('dispute_events', sa.Column('new_status', sa.Enum('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN', name='disputestatus'), nullable=True))
    op.add_column('dispute_events', sa.Column('previous_owner_id', sa.Integer(), nullable=True))
    op.add_column('dispute_events', sa.Column('new_owner_id', sa.Integer(), nullable=True))
    op.add_column('dispute_events', sa.Column('remarks', sa.Text(), nullable=True))

    op.alter_column('dispute_events', 'event_type',
        type_=sa.Enum('DISPUTE_CREATED', 'DISPUTE_REVIEWED', 'DISPUTE_APPROVED', 'DISPUTE_REJECTED', 'ATTENDANCE_CORRECTED', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN', name='disputeeventtype'),
        nullable=False
    )

    op.create_foreign_key('fk_dispute_events_previous_owner_id', 'dispute_events', 'users', ['previous_owner_id'], ['id'])
    op.create_foreign_key('fk_dispute_events_new_owner_id', 'dispute_events', 'users', ['new_owner_id'], ['id'])

    # 5. Create notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('dispute_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.Enum('DISPUTE_SUBMITTED', 'DISPUTE_ASSIGNED', 'DISPUTE_RESOLVED', 'DISPUTE_REJECTED', 'DISPUTE_ESCALATED', 'DEADLINE_WARNING', name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['dispute_id'], ['disputes.id'], ),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_dispute_id'), 'notifications', ['dispute_id'], unique=False)
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_read_at'), 'notifications', ['read_at'], unique=False)
    op.create_index(op.f('ix_notifications_recipient_id'), 'notifications', ['recipient_id'], unique=False)

    # 6. Create correction_windows
    op.create_table(
        'correction_windows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'CLOSED', name='windowstatus'), nullable=False, server_default='OPEN'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_correction_windows_course_id'), 'correction_windows', ['course_id'], unique=False)
    op.create_index(op.f('ix_correction_windows_id'), 'correction_windows', ['id'], unique=False)
    op.create_index(op.f('ix_correction_windows_status'), 'correction_windows', ['status'], unique=False)


def downgrade() -> None:
    op.drop_table('correction_windows')
    op.drop_table('notifications')
    op.drop_table('attendance_sessions')
