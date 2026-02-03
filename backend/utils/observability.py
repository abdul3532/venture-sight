import os
import logging
from openai import OpenAI as OriginalOpenAI

logger = logging.getLogger(__name__)

# Default to no-op
observe = lambda *args, **kwargs: (lambda func: func)
OpenAI = OriginalOpenAI

try:
    # Try to import Langfuse
    from langfuse.decorators import observe as lf_observe
    from langfuse.openai import OpenAI as LfOpenAI
    
    # If successful, use them
    observe = lf_observe
    OpenAI = LfOpenAI
    logger.info("Langfuse observability initialized successfully.")
except Exception as e:
    logger.warning(f"Langfuse initialization failed (observability disabled): {e}")
    # Fallback is already set
