"""Simulation module — synthetic data and demo runner."""

from .data import SimulationState, generate_initial_rows, generate_changed_rows, INITIAL_SCHEMA, CHANGED_SCHEMA
from .runner import run_demo, run_demo_sync

__all__ = [
    "SimulationState",
    "generate_initial_rows",
    "generate_changed_rows",
    "INITIAL_SCHEMA",
    "CHANGED_SCHEMA",
    "run_demo",
    "run_demo_sync",
]
