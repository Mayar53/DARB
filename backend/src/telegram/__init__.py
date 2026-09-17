"""Telegram feature: the opportunity channel bot + per-user subscriptions.

Kept separate from other features (hexagonal): the channel/bot code talks to
Telegram through a port, and the opportunity data reaches it through a Django
signal so the opportunities feature stays unaware of Telegram.
"""
