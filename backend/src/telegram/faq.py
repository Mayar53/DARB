"""The DARB FAQ, mirrored from the public site.

The site renders its own copy from ``frontend/lib/i18n.ts`` (keys
``faq.1q`` … ``faq.7a``). This module exists so the bot can answer ``/faq``
without a network round-trip — which means the two copies must be edited
together when an answer changes.

Each entry is ``(question_ar, answer_ar, question_en, answer_en)``.
"""

from __future__ import annotations

import html

FAQ_ITEMS: tuple[tuple[str, str, str, str], ...] = (
    (
        "ما هو DARB|درب؟",
        "DARB|درب منصة تجمع فرص التطوع والمسابقات والزمالات والتدريب والدورات والورش "
        "والجلسات والمؤتمرات للشباب العراقي في مكان واحد.",
        "What is DARB|درب?",
        "DARB|درب is a platform that brings volunteering, competitions, fellowships, "
        "internships, courses, workshops, sessions and conferences for Iraqi youth "
        "together in one place.",
    ),
    (
        "لماذا نحتاج إليه؟",
        "الفرص موجودة لكنها مبعثرة بين مواقع وصفحات متفرقة، والشباب يضيعون وقتاً وجهداً "
        "في البحث عنها بأنفسهم، وكثير من الفرص لا تصل أصلاً للشخص المناسب، ومن الصعب "
        "متابعة المواعيد النهائية للتقديم.",
        "Why do we need it?",
        "Opportunities exist, but they are scattered across different sites and pages. "
        "Youth waste time and effort searching for them on their own, many opportunities "
        "never reach the right person, and it is hard to keep track of application deadlines.",
    ),
    (
        "ما الذي يميّزه عن المواقع الأخرى؟",
        "تجميع كل الفرص في مكان واحد (تطوع، مسابقات، زمالات، دورات، ورش) مع فلترة سهلة "
        "حسب النوع، وطريقة الحضور (أونلاين/حضوري)، ومدفوع أو مجاني، وتصفح بدون الحاجة لحساب.",
        "How is this different from other sites?",
        "Everything is gathered in one place — volunteering, competitions, fellowships, "
        "courses and workshops — with easy filtering by type, attendance mode "
        "(online / in-person) and whether it is paid or free. You can browse without "
        "creating an account.",
    ),
    (
        "من يضيف الفرص؟",
        "فريق بحث تطوعي مختص يبحث باستمرار عن الفرص من مصادر موثوقة وينشرها عبر لوحة التحكم.",
        "Who adds the opportunities?",
        "A dedicated volunteer research team continuously searches trusted sources and "
        "publishes new opportunities through the admin panel.",
    ),
    (
        "كيف يعمل الموقع؟",
        "فريق البحث التطوعي يجمع الفرص من مصادر موثوقة، يرفعونها عبر لوحة التحكم، فتظهر "
        "أوتوماتيكياً في الصفحة الرئيسية، والزائر يفتح الموقع ويستعرض النتائج ويقدّم مباشرة.",
        "How does the site work?",
        "The research team finds opportunities from trusted sources, uploads them through "
        "the admin panel, and they appear automatically on the home page. Visitors simply "
        "open the site, filter, and apply directly.",
    ),
    (
        "هل أحتاج حساباً للتقديم؟",
        "نعم. يمكن للمستخدمين المسجّلين حفظ الفرص ومتابعتها، والتعليق، والمشاركة، وكسب "
        "النقاط. أما الضيوف فيمكنهم التصفح والتقديم مباشرة عبر موقع الجهة المانحة، لكن "
        "لا يمكنهم حفظ تقدماتهم أو متابعتها.",
        "Do I need an account to apply?",
        "Yes. Registered users can save and track opportunities, comment, share, and earn "
        "points. Guests can browse and apply directly through the opportunity provider's "
        "website, but cannot save or track their applications.",
    ),
    (
        "من هم مشرفو درب ومن أين تأتي الفرص؟",
        "مشرفو درب يأتون من خلفيات مختلفة — بعضهم متطوعون في البحث، بينما آخرون أعضاء في "
        "منظمات وجمعيات. يمكن للمشرفين المعتمدين إضافة الفرص إلى درب بأنفسهم، وفقاً لصلاحياتهم.",
        "Who are DARB admins and where do opportunities come from?",
        "DARB admins come from different backgrounds — some are research volunteers, while "
        "others are members of NGOs and organizations. Approved admins can add opportunities "
        "to DARB themselves, according to their permissions.",
    ),
)


def _esc(value: str) -> str:
    """Escape text for Telegram's HTML parse mode."""
    return html.escape(value or "", quote=False)


def index_text() -> str:
    """The numbered question list, in both languages."""
    lines = ["<b>الأسئلة الشائعة / FAQ</b>", ""]
    for number, (q_ar, _a_ar, q_en, _a_en) in enumerate(FAQ_ITEMS, start=1):
        lines.append(f"{number}. {_esc(q_ar)}")
        lines.append(f"   {_esc(q_en)}")
    lines.append("")
    lines.append("أرسل رقم السؤال للجواب — مثال: <code>/faq 3</code>")
    lines.append("Send a question number for the answer — e.g. <code>/faq 3</code>")
    return "\n".join(lines)


def answer_text(number: int) -> str | None:
    """One question with its answer in both languages, or None if out of range."""
    if number < 1 or number > len(FAQ_ITEMS):
        return None
    q_ar, a_ar, q_en, a_en = FAQ_ITEMS[number - 1]
    return "\n".join(
        [
            f"<b>{_esc(q_ar)}</b>",
            _esc(a_ar),
            "",
            f"<b>{_esc(q_en)}</b>",
            _esc(a_en),
        ]
    )
