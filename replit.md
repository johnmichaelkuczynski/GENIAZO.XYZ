# Ask A Philosopher - Philosophical Q&A Application

### Overview
"Ask A Philosopher" is an application designed for deep philosophical discourse with 59 philosophical and literary figures. It provides seven core functions: philosophical Q&A chat, Model Builder, Paper Writer, Quote Generator, Dialogue Creator, Interview Creator, and Debate Creator. The platform leverages actual writings and advanced AI, specifically a Retrieval-Augmented Generation (RAG) system, to offer nuanced and contextually rich responses, enabling multi-author conversations. The primary goal is to enhance the understanding of complex philosophical and literary concepts through direct engagement with historical thinkers, serving educational and intellectual discourse markets. The application's foundation is a comprehensive RAG database containing 130,000+ text chunks with strict author isolation across 35+ indexed authors. The project aims to provide a centralized knowledge server for philosophical and psychoanalytic texts.

### User Preferences
- **Response Style**: Crisp, direct, no academic bloat. Short sentences. Clear logic. No throat-clearing. Get to the point immediately. Default is Auto mode (no word limit); user can specify word count if desired.
- **Quote Control**: Default is 0 (no mandatory quotes). User can request quotes only if they strengthen the argument.
- **Paper Writing Mode**: Toggle for formal academic papers when specifically needed.
- **Citation Format**: Database filenames converted to readable titles (e.g., "Analog Digital Distinction" not "CORPUS_ANALYSIS_Analog_Digital_Distinction"). NO numeric suffixes/timestamps - just clean work titles.
- **KUCZYNSKI WRITING STYLE**: Short paragraphs (2-4 sentences max), extremely well-defined topic sentences, short to medium punchy sentences, first person voice, NO academic bloat.
- **RAG Approach**: Retrieved passages are injected as "research notes" that the AI internalizes and reasons FROM - not excerpts to stitch together or quote verbatim.
- **Epistemic Humility Override**: All philosophers are programmed with intellectual honesty protocols requiring them to acknowledge decisive evidence against their positions, admit logical contradictions they cannot resolve, show genuine understanding of challenges, attempt responses using their actual resources, and admit limits when stuck. Intellectual honesty comes FIRST, commitment to views SECOND. Great thinkers update beliefs; defending untenable positions is what mediocrities do.
- **Contradiction Handling Protocol**: When retrieved database positions contradict each other, philosophers must: (1) acknowledge the tension explicitly ("I recognize this creates a tension with what I said earlier..."), (2) attempt reconciliation through chronological development, scope limitations, or theoretical tensions, (3) admit unresolved contradictions honestly rather than pretending coherence, (4) maintain philosophical authenticity by representing real intellectual evolution. Goal is self-awareness of contradictions, not elimination.

### System Architecture
The application functions as a centralized knowledge server, offering unified access to philosophical and psychoanalytic texts through a secure internal API. It features a unified single-page layout with a 3-column design (philosophers sidebar, settings, main content) and seven vertically stacked sections.

#### UI/UX Decisions
- **Layout**: 3-column layout (philosophers sidebar, settings, main content) with seven vertically stacked sections.
- **Visuals**: Animated Kuczynski icon, AI-generated portrait avatars, minimalistic design with elegant typography, dark mode support, and visual section dividers.
- **"What to Ask" Feature**: A button on each philosopher chat to suggest topics and questions via a modal.

#### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS.
- **Backend**: Express.js with Node.js and Drizzle ORM.
- **AI Interaction**: User-selectable from 5 LLMs (ZHI 1-5, with Grok as default), configured for aggressive direct reasoning (Temperature 0.7).
- **Streaming**: Server-Sent Events (SSE) for real-time word-by-word AI response delivery.
- **Cross-Section Content Transfer**: Bidirectional content flow facilitated by "Send to" dropdowns.
- **Key Features**: Model Builder (formal/informal, single/multiple models), Paper Writer (up to 50,000 words), Quote Generator, Dialogue Creator, Interview Creator, and Debate Creator (supporting 2-4 debaters with per-debater file uploads and shared context uploads).
- **RAG System**: Utilizes chunked and embedded papers stored in a PostgreSQL database with `pgvector` for semantic search across 87 authors, retrieving 8 most relevant positions per query. Prioritizes structured content (positions, arguments) over raw text.
- **Document Processing**: A CORE Document Processor handles ingestion of PDF, DOCX, TXT, or MD files (up to 100,000 words), generating outlines, positions, arguments, and Q&As. Documents are stored in JSONB format, and unknown authors are automatically created.
- **Anti-Repetition System**: Tracks claims, objections, and argumentative moves to prevent repetition in debates.
- **Dataset Exhaustion Tracking**: Monitors usage of uploaded source material, notifying users when exhaustion is near.
- **Argument Statements Database**: Stores structured philosophical arguments with types, premises, conclusion, source, and importance for semantic search.
- **General Knowledge Fund**: A shared knowledge base for all philosophers, accessible via `GeneralKnowledge` author, containing modern research.
- **Document Upload**: Supports user uploads of .txt, .md, .doc, .docx, .pdf files up to 5MB across sections.
- **Standalone Databases**: Dedicated SQLite databases for Plato and Nietzsche with search APIs.
- **Debate Tracking Service**: Manages extraction of positions, analysis of claims, and formatting of prompts for anti-repetition and unused positions.

### External Dependencies
- **AI Providers**: OpenAI (GPT-4o), Anthropic (Claude Sonnet 4.5), DeepSeek, Perplexity, Grok.
- **Database**: PostgreSQL (Neon) with `pgvector` extension.
- **Embeddings**: OpenAI `text-embedding-ada-002`.
- **File Parsing (Quote Generator & Document Upload)**: Multer, pdf-parse, mammoth.
- **ZHI Knowledge Provider**: `https://analyticphilosophy.net/zhi/query` (for `/zhi/query` endpoint).