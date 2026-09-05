from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('opportunities', '0014_remap_legacy_field_tags'),
    ]

    operations = [
        migrations.AlterField(
            model_name='opportunitymodel',
            name='category',
            field=models.CharField(choices=[('volunteer', 'Volunteering'), ('competition', 'Competitions'), ('fellowship', 'Fellowships'), ('scholarship', 'Scholarships'), ('program', 'Programs'), ('internship', 'Internships'), ('course', 'Courses'), ('workshop', 'Workshops'), ('session', 'Sessions'), ('conference', 'Conferences'), ('grant', 'Grants'), ('research', 'Research'), ('exchange', 'Exchange Programs')], max_length=32),
        ),
        migrations.AlterField(
            model_name='opportunitymodel',
            name='funding',
            field=models.CharField(choices=[('paid', 'Paid'), ('free', 'Free'), ('fully-funded', 'Fully funded'), ('partially-funded', 'Partially funded')], default='free', max_length=16),
        ),
    ]
