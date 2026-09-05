"""Seed the database with realistic demo opportunities across every category.

Idempotent: opportunities are keyed by a stable `seed_key` so re-running never
duplicates rows. Run with: uv run python manage.py seed_opportunities
"""

from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from src.opportunities.models import OpportunityModel
from src.opportunities.adapters.outbound.orm_models import OpportunityField

_SEED_OPPORTUNITIES = [
    {
        "seed_key": "volunteer-eco-baghdad",
        "category": "volunteer",
        "title": "River Cleanup Volunteer — Tigris",
        "description": (
            "Join a weekend cleanup along the Tigris in Baghdad. Gloves, bags and "
            "refreshments provided; a great way to give back and meet other young volunteers."
        ),
        "location": "Baghdad",
        "mode": "in-person",
        "duration": "1 day",
        "funding": "free",
        "age": "all",
        "certificate": False,
        "fields": ["biology", "general"],
        "deadline_offset_days": 21,
        "apply_url": "https://example.com/apply/river-cleanup",
    },
    {
        "seed_key": "competition-hackathon",
        "category": "competition",
        "title": "Youth Innovation Hackathon 2026",
        "description": (
            "48-hour hackathon for Iraqi students to build solutions for smart cities. "
            "Teams of 2–4, mentors on site, cash prizes for the top three teams."
        ),
        "location": "Baghdad",
        "mode": "in-person",
        "duration": "48 hours",
        "funding": "free",
        "age": "15-18",
        "certificate": True,
        "fields": ["computer-science", "engineering"],
        "deadline_offset_days": 30,
        "apply_url": "https://example.com/apply/hackathon",
    },
    {
        "seed_key": "fellowship-leadership",
        "category": "fellowship",
        "title": "Leadership Fellowship — Middle East Program",
        "description": (
            "A 6-month fully-funded fellowship for emerging young leaders from Iraq, "
            "including training, mentoring and a regional exchange visit."
        ),
        "location": "Online + Amman",
        "mode": "hybrid",
        "duration": "6 months",
        "funding": "free",
        "age": "+18",
        "certificate": True,
        "fields": ["business", "social-sciences"],
        "deadline_offset_days": 45,
        "apply_url": "https://example.com/apply/leadership-fellowship",
    },
    {
        "seed_key": "internship-software",
        "category": "internship",
        "title": "Software Engineering Internship — Tech Startup",
        "description": (
            "3-month paid internship at a growing Baghdad tech startup. Work on real "
            "products, learn from senior engineers, and a strong chance of a full-time offer."
        ),
        "location": "Baghdad / Remote",
        "mode": "hybrid",
        "duration": "3 months",
        "funding": "paid",
        "age": "+18",
        "certificate": False,
        "fields": ["computer-science", "engineering"],
        "deadline_offset_days": 14,
        "apply_url": "https://example.com/apply/sw-internship",
    },
    {
        "seed_key": "course-digital-marketing",
        "category": "course",
        "title": "Free Digital Marketing Course",
        "description": (
            "Learn SEO, social media and content strategy in this 4-week online course "
            "designed for beginners. Certificate of completion included."
        ),
        "location": "Online",
        "mode": "online",
        "duration": "4 weeks",
        "funding": "free",
        "age": "15-18",
        "certificate": True,
        "fields": ["business"],
        "deadline_offset_days": 60,
        "apply_url": "https://example.com/apply/digital-marketing",
    },
    {
        "seed_key": "workshop-cv",
        "category": "workshop",
        "title": "CV & Interview Skills Workshop",
        "description": (
            "A half-day workshop in Erbil covering CV writing, LinkedIn profiles and "
            "interview practice with HR professionals from local companies."
        ),
        "location": "Erbil",
        "mode": "in-person",
        "duration": "Half day",
        "funding": "paid",
        "age": "13-15",
        "certificate": False,
        "fields": ["business", "general"],
        "deadline_offset_days": 10,
        "apply_url": "https://example.com/apply/cv-workshop",
    },
    {
        "seed_key": "session-ai",
        "category": "session",
        "title": "Intro to AI for Students — Live Session",
        "description": (
            "A 90-minute live online session introducing artificial intelligence concepts "
            "with practical examples and a Q&A with a university professor."
        ),
        "location": "Online",
        "mode": "online",
        "duration": "90 minutes",
        "funding": "free",
        "age": "all",
        "certificate": False,
        "fields": ["computer-science", "mathematics"],
        "deadline_offset_days": 7,
        "apply_url": "https://example.com/apply/ai-session",
    },
    {
        "seed_key": "conference-youth",
        "category": "conference",
        "title": "Iraq Youth Conference 2026",
        "description": (
            "Two-day national conference gathering youth, NGOs and policymakers to discuss "
            "education, employment and civic participation. Free registration for students."
        ),
        "location": "Basra",
        "mode": "in-person",
        "duration": "2 days",
        "funding": "free",
        "age": "+18",
        "certificate": True,
        "fields": ["social-sciences", "general"],
        "deadline_offset_days": 40,
        "apply_url": "https://example.com/apply/youth-conference",
    },
]


class Command(BaseCommand):
    help = "Seed demo opportunities (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        existing = {
            row.seed_key: row
            for row in OpportunityModel.objects.exclude(seed_key="")
        }
        created = 0
        updated = 0
        for item in _SEED_OPPORTUNITIES:
            deadline = date.today() + timedelta(days=item["deadline_offset_days"])
            fields = item.get("fields", [])
            row = existing.get(item["seed_key"])
            if row is None:
                row = OpportunityModel.objects.create(
                    deadline=deadline,
                    **{
                        k: v
                        for k, v in item.items()
                        if k not in ("seed_key", "deadline_offset_days", "fields")
                    },
                )
                if fields:
                    row.fields.set(OpportunityField.objects.filter(key__in=fields))
                created += 1
            elif fields and not row.fields.exists():
                row.fields.set(OpportunityField.objects.filter(key__in=fields))
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} opportunities, backfilled fields on {updated}."
            )
        )
