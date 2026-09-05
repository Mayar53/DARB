"""Add comment replies — one level of nesting via a self-FK `parent`.

Nesting depth is enforced in the application layer (a reply cannot have a
reply); the DB only stores the self-FK. A DB check can't express
``parent__parent IS NULL`` because it requires a self-join, which Django's
CheckConstraint does not allow on SQLite.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='commentmodel',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='comments.commentmodel'),
        ),
    ]
