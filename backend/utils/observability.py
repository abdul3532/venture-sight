import os
import logging
from openai import OpenAI as OriginalOpenAI
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure env vars are loaded as early as possible for Langfuse
load_dotenv()

# Default to no-op
observe = lambda *args, **kwargs: (lambda func: func)
OpenAI = OriginalOpenAI

# Check for keys (for logging/debugging)
pk = os.getenv("LANGFUSE_PUBLIC_KEY")
sk = os.getenv("LANGFUSE_SECRET_KEY")
host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

if not pk or not sk:
    logger.warning("LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY missing. Observability will be disabled.")
else:
    logger.info(f"Langfuse keys detected. Host: {host}. Public Key: {pk[:6]}... Secret Key: {sk[:6]}...")

try:
    # Try to import Langfuse
    from langfuse.decorators import observe as lf_observe
    from langfuse.openai import OpenAI as LfOpenAI
    
    # If successful and keys are present, use them
    if pk and sk:
        observe = lf_observe
        OpenAI = LfOpenAI
        logger.info("Langfuse observability initialized successfully.")
    else:
        logger.warning("Langfuse imported but keys are missing. Using fallback.")
except ImportError:
    logger.warning("Langfuse package not found. Tracing disabled. Install with 'pip install langfuse'")
except Exception as e:
    logger.error(f"Langfuse initialization failed: {e}")
