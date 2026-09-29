"""attendance_and_disputes

Revision ID: 0002_attendance_and_disputes
Revises: 0001_initial_schema
Create Date: 2026-09-29 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_attendance_and_disputes'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. attendance_records
    op.create_table(
        'attendance_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('status', sa.Enum('PRESENT', 'ABSENT', name='attendancestatus'), nullable=False),
        sa.Column('marked_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
        sa.ForeignKeyConstraint(['marked_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'course_id', 'attendance_date', name='uq_student_course_date')
    )
    op.create_index(op.f('ix_attendance_records_attendance_date'), 'attendance_records', ['attendance_date'], unique=False)
    op.create_index(op.f('ix_attendance_records_course_id'), 'attendance_records', ['course_id'], unique=False)
    op.create_index(op.f('ix_attendance_records_id'), 'attendance_records', ['id'], unique=False)
    op.create_index(op.f('ix_attendance_records_student_id'), 'attendance_records', ['student_id'], unique=False)

    # 2. attendance_versions
    op.create_table(
        'attendance_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attendance_record_id', sa.Integer(), nullable=False),
        sa.Column('old_status', sa.Enum('PRESENT', 'ABSENT', name='attendancestatus'), nullable=False),
        sa.Column('new_status', sa.Enum('PRESENT', 'ABSENT', name='attendancestatus'), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['attendance_record_id'], ['attendance_records.id'], ),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attendance_versions_attendance_record_id'), 'attendance_versions', ['attendance_record_id'], unique=False)
    op.create_index(op.f('ix_attendance_versions_id'), 'attendance_versions', ['id'], unique=False)

    # 3. disputes
    op.create_table(
        'disputes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attendance_record_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'RESOLVED', 'REJECTED', name='disputestatus'), nullable=False, server_default='OPEN'),
        sa.Column('current_owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['attendance_record_id'], ['attendance_records.id'], ),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
        sa.ForeignKeyConstraint(['current_owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_disputes_attendance_record_id'), 'disputes', ['attendance_record_id'], unique=False)
    op.create_index(op.f('ix_disputes_course_id'), 'disputes', ['course_id'], unique=False)
    op.create_index(op.f('ix_disputes_current_owner_id'), 'disputes', ['current_owner_id'], unique=False)
    op.create_index(op.f('ix_disputes_id'), 'disputes', ['id'], unique=False)
    op.create_index(op.f('ix_disputes_status'), 'disputes', ['status'], unique=False)
    op.create_index(op.f('ix_disputes_student_id'), 'disputes', ['student_id'], unique=False)

    # 4. dispute_events
    op.create_table(
        'dispute_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dispute_id', sa.Integer(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('DISPUTE_CREATED', 'DISPUTE_REVIEWED', 'DISPUTE_APPROVED', 'DISPUTE_REJECTED', 'ATTENDANCE_CORRECTED', name='disputeeventtype'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['dispute_id'], ['disputes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dispute_events_dispute_id'), 'dispute_events', ['dispute_id'], unique=False)
    op.create_index(op.f('ix_dispute_events_id'), 'dispute_events', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_dispute_events_id'), table_name='dispute_events')
    op.drop_index(op.f('ix_dispute_events_dispute_id'), table_name='dispute_events')
    op.drop_table('dispute_events')

    op.drop_index(op.f('ix_disputes_student_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_status'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_current_owner_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_course_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_attendance_record_id'), table_name='disputes')
    op.drop_table('disputes')

    op.drop_index(op.f('ix_discrepancies_id'), table_name='attendance_versions')
    op.drop_table('attendance_versions')

    op.drop_index(op.f('ix_attendance_records_student_id'), table_name='attendance_records')
    op.drop_index(op.f('ix_attendance_records_id'), table_name='attendance_records')
    op.drop_index(op.f('ix_attendance_records_course_id'), table_name='attendance_records')
    op.drop_index(op.f('ix_attendance_records_attendance_date'), table_name='attendance_records')
    op.drop_table('attendance_records')
