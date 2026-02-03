# Backend

A Python-based backend service for VentureSight, built with FastAPI.

## Overview

The backend provides APIs for deck analysis, chat functionality, council deliberations, and investment thesis research. It integrates with various AI services and a PostgreSQL database for persistence.

## Directory Structure

- **api/** - API endpoints for chat, council, decks, and thesis
- **db/** - Database schema, migrations, and client utilities
- **models/** - Data models and schemas
- **services/** - Core business logic including:
  - `assistant_service.py` - AI assistant integration
  - `chat_service.py` - Chat functionality
  - `council_service.py` - Council deliberation logic
  - `rag_service.py` - Retrieval-augmented generation
  - `prompts.py` - Prompt templates
  - `pdf_service.py` - PDF processing
  - `thesis_service.py` - Investment thesis generation
- **tools/** - Analysis tools:
  - `competitor_analyzer.py` - Competitor analysis
  - `funding_benchmarker.py` - Funding metrics
  - `investment_readiness.py` - Investment readiness scoring
  - `tam_calculator.py` - Total addressable market calculation
  - `search.py` - Search functionality
  - `pipeline.py` - Data pipeline orchestration
- **utils/** - Utility modules
- **test_data/** - Test data fixtures

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment variables in `config.py`

3. Run database setup:
   ```bash
   psql -U postgres -f db/venturesight_schema.sql
   ```

4. Start the server:
   ```bash
   python main.py
   ```

## Configuration

See `config.py` for all configuration options. Key settings include database connection, API keys, and service endpoints.
