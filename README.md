# Veritas - AI-Powered Knowledge Base Platform

Veritas is an intelligent, context-aware documentation assistant that helps technical software companies transform their existing documentation, repositories, and support channels into a unified, AI-powered knowledge base.

## Overview

Veritas uses Retrieval-Augmented Generation (RAG) to deliver reliable, explainable answers to user queries, complete with source citations. The platform supports both external (public-facing developer docs) and internal (employee-only resources) use cases.

### Key Features

- **Multi-Source Integration**: Connect to GitHub, Confluence, Notion, Slack, and more
- **AI-Powered Search**: Semantic search with context-aware answers
- **Source Citations**: Every answer includes references to source documentation
- **Multiple Deployments**:
  - Customizable website widget
  - Slack and Discord bots
  - Zendesk integration
  - REST APIs
- **Analytics Dashboard**: Track usage, popular queries, and knowledge gaps

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Go 1.22+, RESTful APIs
- **Database**: Supabase (PostgreSQL)
- **Vector Store**: Supabase pgvector or external vector DB
- **LLM Integration**: Support for multiple providers (OpenAI, Anthropic, etc.)

## Project Structure

```
veritas/
├── frontend/          # Next.js application
├── backend/          # Go backend services
├── db/               # Database migrations and schemas
└── .github/          # GitHub Actions workflows
```

## Getting Started

### Prerequisites

- Node.js (LTS version)
- Go 1.22+
- Docker (optional)
- Supabase account

### Development Setup

1. Clone the repository
2. Set up environment variables
3. Start the development servers

Detailed setup instructions coming soon.

## Contributing

We welcome contributions! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 