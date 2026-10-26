"""add assistant settings

Revision ID: c4d3f7a91b20
Revises: 8a1f135c1d14
Create Date: 2026-10-26 23:10:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c4d3f7a91b20'
down_revision: str | Sequence[str] | None = '8a1f135c1d14'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'assistant_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enabled', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('api_url', sa.String(length=2000), nullable=True),
        sa.Column('api_key_ciphertext', sa.String(length=4000), nullable=True),
        sa.Column('model', sa.String(length=120), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('assistant_settings')
