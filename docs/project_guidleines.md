1. Project Overview
This capstone project requires you to design and build a functional AI application. You will
create a production‐ready web application that addresses a real‐world problem or introduces an
innovative solution using LLMs and the technical skills developed throughout the course.
This project demonstrates your ability to:
• Design and implement AI‐powered applications
• Apply professional software architecture patterns
• Deploy and monitor production AI systems
• Transform concepts into working software
This submission constitutes 100% of your second period grade.
1.1 Key Dates
Milestone Date
Project Submission February 3, 2026 ‐ 9:00 AM
Project Defense February 7, 2026 ﴾time slots attributed
closer to date﴿
1.2 Eligibility
You may submit a project for second period evaluation if it has not been previously evaluated.
• If you submitted a project in the first period, you must submit a different project with a clear
difference in domain. There must be no obvious overlap in domain.
Important: Projects with a high similarity to projects evaluated in the first period are not admissible for
second period submission.
2
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
2. Technical Requirements
2.1 Core Requirements
Backend: Python ﴾Required﴿
• Python is the industry standard for AI application development
• Must integrate with an LLM API
• Recommended: Google Gemini ﴾free tier available﴿
• Alternatives: OpenAI GPT, Anthropic Claude, or other major providers ﴾with professor ap‐
proval﴿
Frontend: Your Choice
• Streamlit ﴾covered in class﴿ ‐ simplest option for rapid development
• React, Vue, Next.js, or other modern frameworks
• Any technology that suits your project needs ﴾with professor approval﴿
AI Observability & Monitoring
• Langfuse ﴾covered in class﴿ or alternative observability tools ﴾with professor approval﴿
• Required for debugging and monitoring your AI application
Deployment
• Application must be publicly accessible
• Platform of your choice ﴾Streamlit Cloud, Render, Vercel, AWS, etc.﴿
Documentation
• Root README.md with comprehensive project overview ﴾see README_Template.md for exam‐
ple structure﴿
• docs/ARCHITECTURE.md explaining architecture decisions and technical choices
• docs/TOOLS.md documenting each function calling tool ﴾purpose, parameters, returns﴿
• Complete setup and deployment instructions
• Any additional documentation that helps understand and maintain your project ‐ good docu‐
mentation reflects a professional, production‐ready application
2.2 Bonus Opportunities
Key principle: Innovation and extra effort are valued when they serve your project’s goals. Always
justify your technical decisions.
Important: Any technology choices outside the recommended stack require professor approval
before implementation. Reach out via email mcardoso@novaims.unl.pt to discuss.
3
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
3. Project Scope
3.1 Minimum Viable Product ﴾MVP﴿
Your application must demonstrate the skills taught in class. Design a project that naturally re‐
quires these techniques.
Required Components:
1. AI Integration: LLM integration with proper prompting and structured outputs when needed
﴾e.g., extracting data, routing logic, function parameters﴿
2. Agentic Conversational Interface: Multi‐turn dialogue where the AI agent interacts with your
application’s core functions
• Users interact through chat‐based conversation
• The agent must use your application’s tools to accomplish tasks ‐ not just answer ques‐
tions
• The agent should plan, execute, and respond based on tool results
• This is not a simple chatbot ‐ the conversation drives real application functionality
• Must support multi‐step workflows requiring multiple tool calls in sequence
• Must meaningfully use conversation memory and prior context
3. Function Calling / Tools: Custom tools that the agent uses to interact with your application
• Tools must represent core application functionality
• The agent decides when and how to use them based on user needs
• Must include error handling with retry logic for graceful failures
4. Document Ingestion: Process and utilize document content
• Core feature ﴾analyzing user documents﴿ or supporting feature ﴾company FAQs, knowl‐
edge base﴿
• Must serve a purpose, not just exist to tick a box
5. Clean Architecture: Layered structure with separation of concerns
6. Centralized Configuration: All configurable values must be centralized and easy to find
• Model names, temperatures, and settings in a config file
• Prompts in dedicated files or a prompts module ‐ not hardcoded in functions
• Environment variables documented in .env.example
7. Observability: Tracing integrated throughout ﴾Langfuse or approved alternative﴿
Recommended:
• Multimodal processing: If your project benefits from image/PDF analysis
• RAG with vector databases: For similarity matching and semantic search use cases ﴾finding
4
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
similar products, matching user queries to past support tickets, research paper recommenda‐
tions﴿. Note: With modern 200K+ token context windows, most document Q&A doesn’t need
RAG ‐ you can process documents directly within context. Use RAG/vector search when you
genuinely need “find similar items” functionality or have knowledge bases larger than context
limits, not just to check a box.
Key Principle: Balance is critical. Don’t add features just to meet requirements, but don’t avoid
techniques you’ve learned either. Equally important: don’t overcomplicate features that work fine
as‐is. Apply techniques where they add value, keep things simple where they don’t.
5
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
4. Evaluation Criteria
4.1 What We’re Looking For
Technical Implementation
• Clean architecture with proper separation of concerns
• Effective use of AI capabilities ﴾LLM integration, prompting, structured outputs﴿
• Function calling/tools that genuinely extend your application
• Document ingestion that serves a purpose
• Proper observability and tracing throughout
• Centralized configuration ﴾settings, prompts, environment variables﴿
• Error handling with retry logic
Functionality & User Experience
• Application works reliably and solves the stated problem
• Agentic interface that drives real application functionality through multi‐step workflows
• Meaningful use of conversation memory
• Intuitive, polished user experience
• Features make sense for the problem you’re solving
Innovation & Effort
• Going beyond minimum requirements where it adds value
• Creative solutions to real problems
• Technical depth and sophistication
• Evidence of research and learning beyond class material
Documentation & Professionalism
• Industry‐grade README with clear setup instructions
• Architecture documentation with justification of technical choices
• Tool documentation ﴾purpose, parameters, returns﴿
• Clean, well‐organized code
• Professional presentation and defense
Presentation & Defense
• Compelling investor pitch
• Effective demonstration of key features
• Ability to defend technical decisions
6
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
• Clear communication of project value
Individual Understanding
• Can explain any part of the codebase
• Understands and can justify architectural decisions
• Can discuss trade‐offs and alternatives considered
• Demonstrates mastery of course concepts
Key Principle: Quality over quantity. A well‐executed application that thoughtfully applies appropriate
techniques will score higher than a feature‐bloated project that awkwardly forces every technique without
purpose.
7
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
5. Deliverables
5.1 1. Final Project Submission
Due: February 3, 2026 ‐ 9:00 AM
Moodle Submission:
• Submit complete project as a zip file via Moodle
• Filename: StudentName_SecondPeriod_Project.zip or TeamName_SecondPeriod_Project.zip
GitHub Repository:
• Add mb‐cardoso to your project repository as a collaborator
• Repository must include:
– Complete source code
– Root README.md with comprehensive overview and setup instructions
– docs/ARCHITECTURE.md with architecture decisions and technical justifications
– docs/TOOLS.md documenting each function calling tool ﴾purpose, parameters, re‐
turns﴿
– .env.example documenting all required environment variables
– Centralized configuration ﴾config file, prompts file/folder﴿
– Clear documentation of how to run the application locally
– Any additional documentation your project requires
Deployed Application:
• Application must be deployed and publicly accessible
• Include deployment URL in README
• Platform choice is yours ﴾Streamlit Cloud, Render, Vercel, AWS, etc.﴿
• Must be functional at time of defense
5.2 2. Project Defense
Date: February 7, 2026 ﴾time slots will be attributed closer to date﴿
Duration: 15‐minute presentation + Q&A
• Investor Pitch: Present your application as a startup seeking investment ﴾presentation format
of your choice﴿
• Live Demo: Demonstrate core functionality and key features
• Technical Q&A: Defend technical decisions, architecture choices, and implementation details
• Evaluation Panel: Course professor + AI industry professional
8
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
• Individual Questions: All team members must be prepared to answer questions about any
aspect of the project
Critical: All team members must understand the entire codebase. Being unable to explain code in your
project will significantly impact your grade.
9
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
6. Getting Started
This is an overview of the project process, from conception to final defense.
6.1 Choose Your Problem
• Identify a real‐world problem or innovation opportunity
• Brainstorm how AI can address this problem
6.2 Define Your Application Concept
• What problem does your application solve?
• Who are your users?
• What’s the core value proposition?
• How will users interact with it?
6.3 Plan Your Architecture
• Review clean architecture principles
• Design your layered structure
• Identify which AI capabilities you need:
– What tools/functions will extend the LLM?
– What documents need to be processed?
– Does your project benefit from multimodal processing?
– Do you need RAG/vector database ﴾e.g., semantic search for similarity matching﴿?
6.4 Build
• Set up project structure
• Build core functionality iteratively
• Integrate observability from the beginning
• Deploy early for testing and iteration
6.5 Final Submission
• Industry‐grade README and documentation
• Complete, deployed application
• Clean codebase with proper setup instructions
• See Deliverables section for deadline and submission details
10
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
6.6 Project Defense
• Investor pitch presentation
• Live demonstration
• Technical Q&A defense
• See Deliverables section for date, format, and requirements
11
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
7. Resources & Documentation
7.1 Official Documentation
Google Gemini
• Google AI Studio
• Gemini API Documentation
• Google GenAI Python SDK
Streamlit
• Streamlit Documentation
• Streamlit Components
• Streamlit Cloud Deployment
Langfuse
• Langfuse Documentation
• Python SDK Integration
• Tracing Guide
7.2 Alternative LLM Providers
OpenAI
• OpenAI API Documentation
• Python SDK
Anthropic Claude
• Claude API Documentation
• Python SDK
7.3 Additional Tools
UV Package Manager
• UV Documentation
Database Options ﴾if needed for your project﴿
• MongoDB Atlas + MongoDB Vector Search
• PostgreSQL + psycopg2
• SQLite ﴾built into Python, file‐based﴿
12
NOVA IMS
Bachelor’s Degree in Data Science
Capstone Project ‐ 2025/2026
• Local file‐based storage ﴾JSON, CSV, etc.﴿
7.4 Course Materials
All course materials and examples are available on Moodle.
7.5 Documentation Templates
• README_Template.md ‐ Example README structure for your project