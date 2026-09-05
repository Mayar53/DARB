"""Base use-case contract.

A use case is a single application operation. It receives its dependencies
(ports) via ``__init__`` and is invoked through ``execute``. Keeping a uniform
shape makes wiring in the composition root predictable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class UseCase[TInput, TOutput](ABC):
    @abstractmethod
    def execute(self, data: TInput) -> TOutput:  # pragma: no cover - interface
        raise NotImplementedError
